import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, Loader2, AlertTriangle, MessagesSquare, ExternalLink, Eye,
  ArrowLeft, X,
} from 'lucide-react'
import { getChatRooms, getChatThread } from '../../../api'
import { useSocket } from '../../../contexts/SocketContext'
import { usePermissions } from '../../../contexts/PermissionsContext'
import ChatThread from '../../../components/ChatThread/ChatThread'
import OrderPeekModal from '../../../components/OrderPeekModal/OrderPeekModal'
import { formatChatTime as formatTime } from '../../../components/ChatThread/formatChatTime'
import './ChatMonitor.css'

const STATUS_FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLOSED', label: 'Closed' },
]

/** Non-text messages have no content, so describe the attachment instead. */
function previewOf(message) {
  if (!message) return 'No messages yet'
  if (message.type === 'TEXT') return message.content || '—'
  const label = message.type.charAt(0) + message.type.slice(1).toLowerCase()
  return `${label}`
}

/** Small pictogram in the preview line, the way a messaging client marks media. */
function previewGlyph(message) {
  switch (message?.type) {
    case 'IMAGE': return '🖼'
    case 'AUDIO': return '🎤'
    case 'VIDEO': return '🎬'
    case 'FILE': return '📎'
    default: return null
  }
}

/** Two-letter monogram for a conversation avatar. */
function monogram(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Full-screen messaging client for support.
 *
 * This renders outside the admin shell (see AdminDashboard) — a conversation
 * needs the width, and a nav rail beside a chat list is two sidebars competing
 * for the same job. The way back to the panel lives in the list header.
 */
function ChatMonitor() {
  const navigate = useNavigate()
  const { chatSocket } = useSocket()
  const { hasPermission } = usePermissions()
  const canReply = hasPermission('chat.reply')
  const [searchParams, setSearchParams] = useSearchParams()
  const activeOrderId = searchParams.get('order') ?? ''

  const [rooms, setRooms] = useState([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [roomsError, setRoomsError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  // Only the header needs the thread here — ChatThread loads and renders the
  // messages themselves, and is shared with the order detail page.
  const [thread, setThread] = useState(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [threadError, setThreadError] = useState('')

  // The order behind the open conversation, shown over the chat rather than
  // navigated to — losing your place in a thread to check what the order is
  // costs more than the answer is worth.
  const [peekOrderId, setPeekOrderId] = useState(null)

  const loadRooms = useCallback(async () => {
    setRoomsError('')
    try {
      const res = await getChatRooms({ limit: 100, status: statusFilter })
      setRooms(Array.isArray(res?.items) ? res.items : [])
    } catch (err) {
      setRoomsError(err.message || 'Failed to load conversations')
      setRooms([])
    } finally {
      setRoomsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { loadRooms() }, [loadRooms])

  const loadThread = useCallback(async (orderId) => {
    if (!orderId) { setThread(null); return }
    setThreadLoading(true)
    setThreadError('')
    try {
      setThread(await getChatThread(orderId))
    } catch (err) {
      setThread(null)
      setThreadError(err.message || 'Failed to load conversation')
    } finally {
      setThreadLoading(false)
    }
  }, [])

  useEffect(() => { loadThread(activeOrderId) }, [activeOrderId, loadThread])

  // ChatThread owns the room subscription for the open thread. This listens to
  // the admin firehose instead, so a message on any order reorders the list and
  // updates its unread count even with no thread open.
  useEffect(() => {
    if (!chatSocket) return
    const onMessage = () => loadRooms()
    chatSocket.on('chat.admin.new_message', onMessage)
    return () => chatSocket.off('chat.admin.new_message', onMessage)
  }, [chatSocket, loadRooms])

  const term = search.trim().toLowerCase()
  const visibleRooms = rooms.filter((room) =>
    !term
    || (room.order_no ?? '').toLowerCase().includes(term)
    || room.customer.name.toLowerCase().includes(term)
    || room.provider.name.toLowerCase().includes(term),
  )

  const openRoom = (orderId) => {
    setSearchParams(orderId ? { order: orderId } : {}, { replace: true })
  }

  return (
    <div className={`chat-shell ${activeOrderId ? 'has-thread' : ''}`}>
      {/* ── Conversation list ───────────────────────────────────────────── */}
      <aside className="cm-list">
        <header className="cm-list-head">
          <button
            className="cm-back"
            onClick={() => navigate('/admin')}
            title="Back to admin panel"
            aria-label="Back to admin panel"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="cm-title">Chat</h1>
        </header>

        <div className="cm-list-tools">
          <div className="cm-search">
            <Search size={15} />
            <input
              type="search"
              placeholder="Search or start a conversation"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="cm-filters">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                className={`cm-chip ${statusFilter === value ? 'is-active' : ''}`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {roomsError && (
          <div className="cm-alert">
            <AlertTriangle size={15} />
            <span>{roomsError}</span>
            <button onClick={() => setRoomsError('')} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="cm-list-scroll">
          {roomsLoading ? (
            <div className="cm-state"><Loader2 size={22} className="spin" /><span>Loading…</span></div>
          ) : visibleRooms.length === 0 ? (
            <div className="cm-state">
              <MessagesSquare size={26} />
              <span>{rooms.length === 0 ? 'No conversations yet' : 'No matches'}</span>
            </div>
          ) : (
            visibleRooms.map((room) => {
              const last = room.last_message
              const glyph = previewGlyph(last)
              return (
                <button
                  key={room.id}
                  className={`cm-room ${activeOrderId === room.order_id ? 'is-active' : ''}`}
                  onClick={() => openRoom(room.order_id)}
                >
                  <span className="cm-room-avatar" aria-hidden="true">
                    {monogram(room.customer.name)}
                  </span>
                  <span className="cm-room-body">
                    <span className="cm-room-top">
                      <span className="cm-room-order">{room.order_no ?? 'Order'}</span>
                      {last && <span className="cm-room-time">{formatTime(last.created_at)}</span>}
                    </span>
                    <span className="cm-room-people">
                      {room.customer.name} · {room.provider.name}
                    </span>
                    <span className="cm-room-bottom">
                      <span className="cm-room-preview">
                        {last && (
                          <em className="cm-room-who">
                            {{ CUSTOMER: 'Customer', PROVIDER: 'Provider', ADMIN: 'You' }[last.sender_role] ?? '—'}:
                          </em>
                        )}
                        {glyph && <span className="cm-room-glyph">{glyph}</span>}
                        {previewOf(last)}
                      </span>
                      {room.unread_count > 0 && (
                        <span className="cm-unread">{room.unread_count}</span>
                      )}
                    </span>
                  </span>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* ── Thread ──────────────────────────────────────────────────────── */}
      <section className="cm-thread">
        {!activeOrderId ? (
          <div className="cm-state cm-state--full">
            <MessagesSquare size={40} />
            <h2>Support inbox</h2>
            <p>
              Pick an order on the left to read its conversation and reply as
              support.
            </p>
          </div>
        ) : threadLoading ? (
          <div className="cm-state cm-state--full">
            <Loader2 size={30} className="spin" /><span>Loading conversation…</span>
          </div>
        ) : threadError ? (
          <div className="cm-state cm-state--full">
            <AlertTriangle size={30} />
            <h2>Could not load conversation</h2>
            <p>{threadError}</p>
          </div>
        ) : thread && (
          <>
            <header className="cm-thread-head">
              <button
                className="cm-thread-back"
                onClick={() => openRoom('')}
                aria-label="Back to conversations"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="cm-thread-avatar" aria-hidden="true">
                {monogram(thread.participants.customer.name)}
              </span>
              <div className="cm-thread-id">
                <h2>{thread.room.order_no ?? 'Order'}</h2>
                <p>
                  {thread.participants.customer.name} · {thread.participants.provider.name}
                  {thread.room.order_status ? ` · ${thread.room.order_status}` : ''}
                </p>
              </div>
              <div className="cm-thread-actions">
                {!canReply && <span className="cm-readonly"><Eye size={13} /> Read-only</span>}
                <button
                  className="cm-open-order"
                  onClick={() => setPeekOrderId(thread.room.order_id)}
                >
                  Open order <ExternalLink size={13} />
                </button>
              </div>
            </header>

            <ChatThread
              key={activeOrderId}
              orderId={activeOrderId}
              onRead={loadRooms}
            />
          </>
        )}
      </section>

      {peekOrderId && (
        <OrderPeekModal
          orderId={peekOrderId}
          onClose={() => setPeekOrderId(null)}
        />
      )}
    </div>
  )
}

export default ChatMonitor
