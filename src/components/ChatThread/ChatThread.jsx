import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import {
  Loader2, AlertTriangle, MessagesSquare, Info, Send, X,
  Image as ImageIcon, Mic, Video, Paperclip,
} from 'lucide-react'
import { getChatThread, sendChatMessage, markChatThreadRead } from '../../api'
import { useSocket } from '../../contexts/SocketContext'
import { usePermissions } from '../../contexts/PermissionsContext'
import { formatClock, formatDayLabel, isNewDay } from './formatChatTime'
import './ChatThread.css'

const TYPE_ICONS = {
  IMAGE: ImageIcon,
  AUDIO: Mic,
  VIDEO: Video,
  FILE: Paperclip,
}

/**
 * Renders a message's payload inline. Photos and clips a customer sent are the
 * whole point of the message, so they play in the thread rather than sending
 * the admin off to a raw S3 URL in another tab. Only a generic FILE — which the
 * browser cannot render — stays a link, and a broken/expired media URL falls
 * back to that same link rather than an empty box.
 */
function Attachment({ message, onZoom }) {
  const [broken, setBroken] = useState(false)
  const url = message.file_url
  const TypeIcon = TYPE_ICONS[message.type]

  if (message.type === 'TEXT') return <p>{message.content}</p>

  const label = message.type.charAt(0) + message.type.slice(1).toLowerCase()
  const link = (
    <a className="ct-attachment" href={url ?? '#'} target="_blank" rel="noopener noreferrer">
      {TypeIcon && <TypeIcon size={15} />}
      {label}
      {message.duration ? ` · ${message.duration}s` : ''}
    </a>
  )

  if (!url || broken) return link

  if (message.type === 'IMAGE') {
    return (
      <button type="button" className="ct-photo" onClick={() => onZoom(url)}>
        <img src={url} alt={message.content || 'Shared photo'} loading="lazy" onError={() => setBroken(true)} />
      </button>
    )
  }

  if (message.type === 'AUDIO') {
    return <audio className="ct-audio" controls preload="metadata" src={url} onError={() => setBroken(true)} />
  }

  if (message.type === 'VIDEO') {
    return <video className="ct-video" controls preload="metadata" src={url} onError={() => setBroken(true)} />
  }

  return link
}

/**
 * One order's customer ↔ provider conversation, shared by the Chat page and the
 * order detail Chat tab.
 *
 * The admin joins the chat room over the existing /api/v1/ws/chat namespace, so
 * new messages land without a refresh. The composer only appears with the
 * `chat.reply` permission — without it this is a read-only window.
 */
function ChatThread({ orderId, onLoaded, onRead }) {
  const { chatSocket } = useSocket()
  const { hasPermission } = usePermissions()
  const canReply = hasPermission('chat.reply')

  const [thread, setThread] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const scrollRef = useRef(null)

  const load = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    setError('')
    try {
      const data = await getChatThread(orderId)
      setThread(data)
      onLoaded?.(data)
    } catch (err) {
      setThread(null)
      // A missing room is the normal case for an order nobody has messaged on.
      setError(err.status === 404
        ? 'No conversation started for this order yet.'
        : err.message || 'Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }, [orderId, onLoaded])

  useEffect(() => { load() }, [load])

  // The id of the newest message someone else wrote. It changes on open and
  // again whenever a live message lands, which is exactly when the thread needs
  // marking read — a message arriving in a thread the admin is already reading
  // should never light a badge up.
  const messages = thread?.messages
  const lastIncomingId = messages?.reduce(
    (id, m) => (m.sender_role === 'CUSTOMER' || m.sender_role === 'PROVIDER' ? m.id : id),
    null,
  )

  // Marking read clears the row's count. The sidebar badge only refetches on a
  // route change, and picking a conversation just swaps a query param, so it is
  // told directly rather than left showing a count of nothing.
  useEffect(() => {
    if (!orderId || loading || error || !lastIncomingId) return
    markChatThreadRead(orderId)
      .then(() => {
        onRead?.()
        window.dispatchEvent(new CustomEvent('admin:chat-read'))
      })
      .catch(() => {})
  }, [orderId, loading, error, lastIncomingId, onRead])

  const handleSend = async (e) => {
    e.preventDefault()
    const content = draft.trim()
    if (!content || sending) return

    setSending(true)
    setSendError('')
    try {
      await sendChatMessage(orderId, content)
      setDraft('')
      // The websocket echo appends the message; refetch only if it never lands.
    } catch (err) {
      setSendError(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (!chatSocket || !orderId) return

    const join = () => chatSocket.emit('join_room', { order_id: orderId })
    join()
    chatSocket.on('connect', join)

    const onMessage = (payload) => {
      if (payload?.order_id && payload.order_id !== orderId) return
      setThread((prev) => {
        if (!prev || prev.messages.some((m) => m.id === payload.id)) return prev

        const { customer, provider } = prev.participants
        let sender
        if (payload.type === 'SYSTEM') {
          sender = { role: 'SYSTEM', name: 'System' }
        } else if (payload.sender_id === customer.id) {
          sender = customer
        } else if (payload.sender_id === provider.id) {
          sender = provider
        } else {
          // An admin reply — the socket payload carries no name, so show a
          // neutral label until the next full load resolves it.
          sender = { role: 'ADMIN', name: 'Support' }
        }

        return {
          ...prev,
          messages: [...prev.messages, {
            id: payload.id,
            type: payload.type,
            content: payload.content,
            file_url: payload.file_url,
            duration: payload.duration,
            created_at: payload.created_at ?? new Date().toISOString(),
            sender_id: payload.sender_id,
            sender_role: sender.role,
            sender_name: sender.name,
          }],
        }
      })
    }

    chatSocket.on('chat.new_message', onMessage)
    return () => {
      chatSocket.off('connect', join)
      chatSocket.off('chat.new_message', onMessage)
    }
  }, [chatSocket, orderId])

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [thread?.messages?.length, loading])

  // Escape closes the photo viewer.
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  const viewer = lightbox && (
    <div
      className="ct-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      onClick={() => setLightbox(null)}
    >
      <button type="button" className="ct-lightbox-close" aria-label="Close photo">
        <X size={20} />
      </button>
      <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
    </div>
  )

  // The composer sits below every state except a hard load failure, so an
  // admin can open a quiet thread and start the conversation.
  const composer = canReply && thread && (
    <form className="ct-composer" onSubmit={handleSend}>
      {sendError && (
        <p className="ct-send-error"><AlertTriangle size={13} /> {sendError}</p>
      )}
      <div className="ct-composer-row">
        <textarea
          className="ct-input"
          rows={1}
          placeholder="Reply as support…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter makes a new line.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend(e)
            }
          }}
          disabled={sending}
        />
        <button
          type="submit"
          className="ct-send"
          disabled={sending || !draft.trim()}
          aria-label="Send message"
        >
          {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
        </button>
      </div>
    </form>
  )

  if (loading) {
    return (
      <div className="ct-state">
        <Loader2 size={28} className="spin" />
        <span>Loading conversation…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ct-state">
        <AlertTriangle size={28} />
        <span>{error}</span>
      </div>
    )
  }

  if (!thread || thread.messages.length === 0) {
    return (
      <>
        <div className="ct-state">
          <MessagesSquare size={28} />
          <span>No messages in this conversation yet.</span>
        </div>
        {composer}
      </>
    )
  }

  return (
    <>
    <div className="ct-messages" ref={scrollRef}>
      {thread.messages.map((message, i) => {
        const role = message.sender_role
        const prev = thread.messages[i - 1]
        const divider = isNewDay(prev?.created_at, message.created_at) && (
          <div className="ct-day" key={`day-${message.id}`}>
            <span>{formatDayLabel(message.created_at)}</span>
          </div>
        )

        if (role === 'SYSTEM') {
          return (
            <Fragment key={message.id}>
              {divider}
              <div className="ct-system">
                <Info size={12} />
                <span>{message.content}</span>
              </div>
            </Fragment>
          )
        }

        // Runs from the same person collapse into one block: only the first
        // bubble carries the name, so a burst of replies reads as one turn.
        const grouped = prev
          && prev.sender_role === role
          && prev.sender_id === message.sender_id
          && !isNewDay(prev.created_at, message.created_at)

        const isPhoto = message.type === 'IMAGE' && message.file_url

        return (
          <Fragment key={message.id}>
            {divider}
            <article
              className={[
                'ct-msg',
                `ct-msg--${role.toLowerCase()}`,
                grouped ? 'is-grouped' : '',
                isPhoto ? 'is-media' : '',
              ].filter(Boolean).join(' ')}
            >
              {!grouped && (
                <div className="ct-msg-head">
                  <strong>{message.sender_name}</strong>
                  <span className={`ct-role ct-role--${role.toLowerCase()}`}>{role}</span>
                </div>
              )}
              <div className="ct-msg-body">
                <Attachment message={message} onZoom={setLightbox} />
              </div>
              <time className="ct-msg-time" dateTime={message.created_at}>
                {formatClock(message.created_at)}
              </time>
            </article>
          </Fragment>
        )
      })}
    </div>
    {composer}
    {viewer}
    </>
  )
}

export default ChatThread
