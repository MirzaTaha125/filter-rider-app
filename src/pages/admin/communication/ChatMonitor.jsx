import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search, AlertTriangle, MessagesSquare, ExternalLink, Eye,
  ArrowLeft, X,
} from 'lucide-react'
import { getChatRooms, getChatThread, markChatThreadRead } from '../../../api'
import { useSocket } from '../../../contexts/SocketContext'
import { usePermissions } from '../../../contexts/PermissionsContext'
import ChatThread from '../../../components/ChatThread/ChatThread'
import OrderPeekModal from '../../../components/OrderPeekModal/OrderPeekModal'
import { formatChatTime as formatTime } from '../../../components/ChatThread/formatChatTime'
import './ChatMonitor.css'
import { ChatRoomsShimmer, ChatThreadShimmer } from '../../../components/Shimmer/Shimmer'


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
 * Support inbox. It stays inside the admin shell so the side menu remains
 * available while a conversation is open.
 */
function ChatMonitor() {
  const { chatSocket } = useSocket()
  const { hasPermission } = usePermissions()
  const canReply = hasPermission('chat.reply')
  const [searchParams, setSearchParams] = useSearchParams()
  const activeOrderId = searchParams.get('order') ?? ''

  const [rooms, setRooms] = useState([])
  const [roomCounts, setRoomCounts] = useState(null)
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

  // Rooms this admin has opened this session. Refetches race mark-read when
  // hopping A→B, so without this the previous chat's badge pops back.
  const clearedOrderIdsRef = useRef(new Set())
  const roomsFetchGenRef = useRef(0)
  const prevOrderIdRef = useRef('')

  const applyRooms = useCallback((items) => {
    const cleared = clearedOrderIdsRef.current
    setRooms(
      items.map((room) =>
        cleared.has(room.order_id) ? { ...room, unread_count: 0 } : room,
      ),
    )
  }, [])

  const loadRooms = useCallback(async () => {
    const gen = ++roomsFetchGenRef.current
    setRoomsError('')
    try {
      const res = await getChatRooms({ limit: 100 })
      if (gen !== roomsFetchGenRef.current) return
      const items = Array.isArray(res?.items) ? res.items : []
      applyRooms(items)
      const fromApi = res?.meta?.counts
      const active = items.filter((room) => room.status === 'ACTIVE').length
      const closed = items.filter((room) => room.status === 'CLOSED').length
      setRoomCounts(fromApi ?? {
        all: res?.meta?.total ?? items.length,
        active,
        closed,
      })
    } catch (err) {
      if (gen !== roomsFetchGenRef.current) return
      setRoomsError(err.message || 'Failed to load conversations')
      setRooms([])
    } finally {
      if (gen === roomsFetchGenRef.current) setRoomsLoading(false)
    }
  }, [applyRooms])

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

  const clearRoomBadge = useCallback((orderId) => {
    if (!orderId) return
    clearedOrderIdsRef.current.add(orderId)
    setRooms((prev) =>
      prev.map((room) =>
        room.order_id === orderId ? { ...room, unread_count: 0 } : room,
      ),
    )
  }, [])

  const markRoomRead = useCallback((orderId) => {
    if (!orderId) return Promise.resolve()
    clearRoomBadge(orderId)
    return markChatThreadRead(orderId)
      .then(() => {
        window.dispatchEvent(new CustomEvent('admin:chat-read'))
      })
      .catch(() => {})
  }, [clearRoomBadge])

  // Opening / switching conversations: clear the new room (and finish clearing
  // the previous one) so hopping A→B never brings A's counter back.
  useEffect(() => {
    const previousId = prevOrderIdRef.current
    prevOrderIdRef.current = activeOrderId

    if (previousId && previousId !== activeOrderId) {
      markRoomRead(previousId)
    }
    if (!activeOrderId) return

    markRoomRead(activeOrderId).then(() => loadRooms())
  }, [activeOrderId, markRoomRead, loadRooms])

  // ChatThread owns the room subscription for the open thread. This listens to
  // the admin firehose instead, so a message on any order reorders the list and
  // updates its unread count even with no thread open.
  useEffect(() => {
    if (!chatSocket) return
    const onMessage = (payload) => {
      const orderId = payload?.order_id
      if (orderId && orderId === activeOrderId) {
        // Already viewing — keep badge off and re-mark read.
        clearRoomBadge(orderId)
        markChatThreadRead(orderId).catch(() => {})
      } else if (orderId) {
        // Fresh message on another room — allow its badge again.
        clearedOrderIdsRef.current.delete(orderId)
      }
      loadRooms()
    }
    chatSocket.on('chat.admin.new_message', onMessage)
    return () => chatSocket.off('chat.admin.new_message', onMessage)
  }, [chatSocket, loadRooms, activeOrderId, clearRoomBadge])

  const term = search.trim().toLowerCase()
  const visibleRooms = rooms.filter((room) => {
    const statusOk = statusFilter === 'All' || room.status === statusFilter
    const termOk = !term
      || (room.order_no ?? '').toLowerCase().includes(term)
      || room.customer.name.toLowerCase().includes(term)
      || room.provider.name.toLowerCase().includes(term)
    return statusOk && termOk
  })
  const chipCount = {
    All: roomCounts?.all,
    ACTIVE: roomCounts?.active,
    CLOSED: roomCounts?.closed,
  }

  const openRoom = (orderId) => {
    setSearchParams(orderId ? { order: orderId } : {}, { replace: true })
  }

  const activeRoom = rooms.find((room) => room.order_id === activeOrderId)
  const barCustomer = thread?.participants?.customer?.name || activeRoom?.customer?.name || ''
  const barProvider = thread?.participants?.provider?.name || activeRoom?.provider?.name || ''
  const barOrderNo = thread?.room?.order_no || activeRoom?.order_no || 'Order'
  const barStatus = thread?.room?.order_status || ''
  const barOrderId = thread?.room?.order_id || activeOrderId

  return (
    <div className={`chat-shell ${activeOrderId ? 'has-thread' : ''}`}>
      {/* ── Conversation list ───────────────────────────────────────────── */}
      <aside className="cm-list">
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
                {chipCount[value] != null && (
                  <span className="tab-count">{chipCount[value]}</span>
                )}
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
            <ChatRoomsShimmer rows={8} />
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
        ) : (
          <>
            {(threadLoading || !thread) && !threadError ? (
              <header className="cm-thread-head" aria-busy="true" aria-label="Loading">
                <span className="shimmer cm-head-shimmer-avatar" />
                <div className="cm-thread-id">
                  <span className="shimmer cm-head-shimmer-title" />
                  <span className="shimmer cm-head-shimmer-sub" />
                </div>
                <span className="shimmer cm-head-shimmer-open" />
              </header>
            ) : (
              <header className="cm-thread-head">
                <button
                  className="cm-thread-back"
                  onClick={() => openRoom('')}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={18} />
                </button>
                <span className="cm-thread-avatar" aria-hidden="true">
                  {monogram(barCustomer)}
                </span>
                <div className="cm-thread-id">
                  <h2>{barOrderNo}</h2>
                  <p>
                    {[barCustomer, barProvider].filter(Boolean).join(' · ')}
                    {barStatus ? ` · ${barStatus}` : ''}
                  </p>
                </div>
                <div className="cm-thread-actions">
                  {!canReply && <span className="cm-readonly"><Eye size={13} /> Read-only</span>}
                  <button
                    className="cm-open-order"
                    onClick={() => setPeekOrderId(barOrderId)}
                  >
                    Open order <ExternalLink size={13} />
                  </button>
                </div>
              </header>
            )}

            {threadError ? (
              <div className="cm-state cm-state--full">
                <AlertTriangle size={30} />
                <h2>Could not load conversation</h2>
                <p>{threadError}</p>
              </div>
            ) : threadLoading || !thread ? (
              <ChatThreadShimmer />
            ) : (
              <ChatThread
                key={activeOrderId}
                orderId={activeOrderId}
                onRead={() => {
                  clearRoomBadge(activeOrderId)
                  loadRooms()
                }}
              />
            )}
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
