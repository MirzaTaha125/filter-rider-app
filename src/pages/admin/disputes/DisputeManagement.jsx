import { useState, useEffect, useCallback, useRef } from 'react'
import { Eye, X, Save, User, Package, Shield, Send, X as XIcon } from 'lucide-react'
import { getDisputes, getDispute, updateDisputeStatus, addDisputeMessage } from '../../../api/disputes.js'
import { useSocket } from '../../../contexts/SocketContext.jsx'
import './DisputeManagement.css'

const STATUS_OPTIONS = ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED']

const STATUS_LABELS = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
}

const STATUS_CSS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under-review',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
}

const SENDER_ICONS = {
  CUSTOMER: User,
  PROVIDER: Package,
  ADMIN: Shield,
}

const SENDER_LABELS = {
  CUSTOMER: 'Customer',
  PROVIDER: 'Service Provider',
  ADMIN: 'Admin',
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function DisputeManagement() {
  const { disputesSocket } = useSocket()
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [statusChange, setStatusChange] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  const [replyText, setReplyText] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  const messagesEndRef = useRef(null)
  const selectedDisputeRef = useRef(null)
  selectedDisputeRef.current = selectedDispute

  const loadDisputes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const data = await getDisputes()
      setDisputes(data)
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load disputes')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { loadDisputes() }, [loadDisputes])

  // Real-time socket event listeners
  useEffect(() => {
    if (!disputesSocket) return

    const handleNewMessage = (payload) => {
      const current = selectedDisputeRef.current
      if (current && payload?.dispute_id === current.id) {
        if (payload.dispute) {
          setSelectedDispute(payload.dispute)
        } else if (payload.message) {
          setSelectedDispute(prev => {
            if (!prev) return prev
            const msgs = prev.messages || []
            const exists = msgs.some(m => m.id === payload.message.id)
            if (exists) return prev
            return {
              ...prev,
              messages: [...msgs, payload.message],
            }
          })
        }
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
      // Refresh disputes list silently to update counts or latest preview
      loadDisputes(true)
    }

    const handleDisputeUpdated = (updated) => {
      if (!updated) return
      const current = selectedDisputeRef.current
      if (current && (updated.id === current.id || updated.dispute_id === current.id)) {
        setSelectedDispute(prev => ({ ...prev, ...updated }))
      }
      setDisputes(prev => prev.map(d => (d.id === (updated.id || updated.dispute_id)) ? { ...d, ...updated } : d))
    }

    disputesSocket.on('dispute.new_message', handleNewMessage)
    disputesSocket.on('dispute.updated', handleDisputeUpdated)

    return () => {
      disputesSocket.off('dispute.new_message', handleNewMessage)
      disputesSocket.off('dispute.updated', handleDisputeUpdated)
    }
  }, [disputesSocket, loadDisputes])

  const openModal = async (dispute) => {
    setSelectedDispute(dispute)
    setStatusChange(dispute.status)
    setReplyText('')
    setIsInternalNote(false)
    setIsModalOpen(true)
    setDetailLoading(true)

    if (disputesSocket) {
      disputesSocket.emit('join_dispute', { dispute_id: dispute.id })
    }

    try {
      const detail = await getDispute(dispute.id)
      setSelectedDispute(detail)
      setStatusChange(detail.status)
    } catch (err) {
      // keep the list-level data, just no messages
    } finally {
      setDetailLoading(false)
    }
  }

  const closeModal = () => {
    if (disputesSocket && selectedDispute) {
      disputesSocket.emit('leave_dispute', { dispute_id: selectedDispute.id })
    }
    setIsModalOpen(false)
    setSelectedDispute(null)
    setStatusChange('')
    setReplyText('')
    setIsInternalNote(false)
  }

  const handleSaveStatus = async () => {
    if (!selectedDispute || statusChange === selectedDispute.status) { closeModal(); return }
    setSavingStatus(true)
    try {
      const updated = await updateDisputeStatus(selectedDispute.id, statusChange)
      setSelectedDispute(updated)
      setDisputes(prev => prev.map(d => d.id === updated.id ? { ...d, status: updated.status } : d))
    } catch (err) {
      setError(err.message || 'Failed to update status')
    } finally {
      setSavingStatus(false)
      closeModal()
    }
  }

  const handleSendMessage = async () => {
    if (!replyText.trim() || !selectedDispute) return
    setSendingMessage(true)
    try {
      const updated = await addDisputeMessage(selectedDispute.id, replyText.trim(), isInternalNote)
      setSelectedDispute(updated)
      setReplyText('')
      setIsInternalNote(false)
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (err) {
      setError(err.message || 'Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  return (
    <div className="dispute-management">
      <div className="dispute-header">
        <h1 className="dispute-title">Dispute & Complaint Resolution</h1>
        <p className="dispute-subtitle">Manage and resolve customer and SP disputes</p>
      </div>

      {error && (
        <div className="dispute-error">
          {error}
          <button onClick={() => setError(null)}><XIcon size={14} /></button>
        </div>
      )}

      <div className="disputes-table-container">
        {loading ? (
          <div className="dispute-loading">Loading disputes...</div>
        ) : disputes.length === 0 ? (
          <div className="dispute-empty">No disputes found.</div>
        ) : (
          <table className="disputes-table">
            <thead>
              <tr>
                <th>DISPUTE ID</th>
                <th>ORDER ID</th>
                <th>CUSTOMER</th>
                <th>SERVICE PROVIDER</th>
                <th>TYPE</th>
                <th>STATUS</th>
                <th>DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((dispute) => (
                <tr key={dispute.id}>
                  <td className="dispute-code">{dispute.dispute_code || dispute.id}</td>
                  <td>{dispute.order?.order_no || '—'}</td>
                  <td>{dispute.customer?.user?.full_name ?? dispute.customer?.full_name ?? '—'}</td>
                  <td>{dispute.provider?.user?.full_name ?? dispute.provider?.full_name ?? '—'}</td>
                  <td>{dispute.type?.replace(/_/g, ' ') || '—'}</td>
                  <td>
                    <span className={`status-badge ${STATUS_CSS[dispute.status] || 'pending'}`}>
                      {STATUS_LABELS[dispute.status] || dispute.status}
                    </span>
                  </td>
                  <td>{formatDate(dispute.created_at)}</td>
                  <td>
                    <button className="btn-view" onClick={() => openModal(dispute)}>
                      <Eye size={16} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Elite Dispute Detail Modal */}
      {isModalOpen && selectedDispute && (
        <div className="elite-modal-overlay" onClick={closeModal}>
          <div className="elite-dispute-modal" onClick={(e) => e.stopPropagation()}>
            <div className="elite-modal-header">
              <div className="elite-header-left">
                <span className="elite-dispute-id">#{selectedDispute.dispute_code || selectedDispute.id}</span>
                <h2 className="elite-modal-title">Dispute Management</h2>
              </div>
              <div className="elite-header-right">
                <span className={`elite-status-badge ${STATUS_CSS[selectedDispute.status] || 'pending'}`}>
                  {STATUS_LABELS[selectedDispute.status] || selectedDispute.status}
                </span>
                <button className="elite-close-btn" onClick={closeModal}>
                  <XIcon size={20} />
                </button>
              </div>
            </div>

            <div className="elite-modal-body">
              {/* 1. Context Information Card */}
              <div className="elite-info-card">
                <div className="elite-info-grid">
                  <div className="elite-info-item">
                    <label>Order Reference</label>
                    <div className="info-value">{selectedDispute.order?.order_no || '—'}</div>
                  </div>
                  <div className="elite-info-item">
                    <label>Dispute Type</label>
                    <div className="info-value accent-text">{selectedDispute.type?.replace(/_/g, ' ') || '—'}</div>
                  </div>
                  <div className="elite-info-item">
                    <label>Date Opened</label>
                    <div className="info-value text-muted">{formatDate(selectedDispute.created_at)}</div>
                  </div>
                  <div className="elite-info-item">
                    <label>Last Activity</label>
                    <div className="info-value text-muted">{formatDate(selectedDispute.updated_at)}</div>
                  </div>
                </div>
              </div>

              {/* 2. Involved Parties Section */}
              <div className="elite-section">
                <h3 className="elite-section-label">Involved Parties</h3>
                <div className="elite-parties-row">
                  <div className="elite-party-card customer">
                    <div className="party-avatar">
                      {selectedDispute.customer?.user?.avatar ? (
                        <img src={selectedDispute.customer.user.avatar} alt="" />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                    <div className="party-info">
                      <label>Customer</label>
                      <div className="party-name">{selectedDispute.customer?.user?.full_name ?? selectedDispute.customer?.full_name ?? '—'}</div>
                      <div className="party-subtext">{selectedDispute.customer?.user?.phone || 'No phone'}</div>
                    </div>
                  </div>
                  <div className="elite-party-card provider">
                    <div className="party-avatar">
                      {selectedDispute.provider?.user?.avatar ? (
                        <img src={selectedDispute.provider.user.avatar} alt="" />
                      ) : (
                        <Package size={20} />
                      )}
                    </div>
                    <div className="party-info">
                      <label>Service Provider</label>
                      <div className="party-name">{selectedDispute.provider?.user?.full_name ?? selectedDispute.provider?.full_name ?? '—'}</div>
                      <div className="party-subtext">{selectedDispute.provider?.user?.phone || 'No phone'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Incident Details */}
              <div className="elite-section">
                <h3 className="elite-section-label">Incident Overview</h3>
                <div className="elite-incident-details">
                  <div className="detail-row">
                    <label>Reason Given</label>
                    <p>{selectedDispute.reason || 'No specific reason provided.'}</p>
                  </div>
                  {selectedDispute.description && (
                    <div className="detail-row">
                      <label>Detailed Description</label>
                      <p>{selectedDispute.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Communication Thread */}
              <div className="elite-section messages-section">
                <h3 className="elite-section-label">Message History</h3>
                <div className="elite-message-thread">
                  {detailLoading ? (
                    <div className="elite-loading">Fetching conversation...</div>
                  ) : (!selectedDispute.messages || selectedDispute.messages.length === 0) ? (
                    <div className="elite-empty-thread">No messages have been exchanged yet.</div>
                  ) : (
                    selectedDispute.messages.map((msg) => {
                      const SenderIcon = SENDER_ICONS[msg.sender_type] || User
                      return (
                        <div
                          key={msg.id}
                          className={`elite-msg bubble-${msg.sender_type?.toLowerCase()} ${msg.is_internal_note ? 'is-internal' : ''}`}
                        >
                          <div className="elite-msg-header">
                            <span className="msg-sender">
                              <SenderIcon size={12} className="sender-icon" />
                              {msg.sender_type === 'CUSTOMER'
                                ? (selectedDispute.customer?.user?.full_name ?? SENDER_LABELS.CUSTOMER)
                                : msg.sender_type === 'PROVIDER'
                                ? (selectedDispute.provider?.user?.full_name ?? SENDER_LABELS.PROVIDER)
                                : SENDER_LABELS[msg.sender_type] ?? msg.sender_type}
                            </span>
                            <span className="msg-time">{formatDate(msg.created_at)}</span>
                          </div>
                          <div className="elite-msg-body">{msg.message}</div>
                          {msg.is_internal_note && <div className="internal-indicator">OFFICIAL INTERNAL NOTE</div>}
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* 5. Resolution Zone */}
              <div className="elite-resolution-zone">
                <div className="zone-header">
                  <h3 className="elite-section-label">Submit Response</h3>
                  <div className="status-quick-switch">
                    <label>Set Resolution Status</label>
                    <select
                      className="elite-status-select"
                      value={statusChange}
                      onChange={e => setStatusChange(e.target.value)}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="elite-reply-area">
                  <textarea
                    className="elite-reply-input"
                    placeholder="Type your official response or internal team note here..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendMessage() }}
                  />
                  <div className="elite-reply-toolbar">
                    <label className="elite-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={e => setIsInternalNote(e.target.checked)}
                      />
                      <span>Internal team note</span>
                    </label>
                    <button
                      className="elite-btn-send"
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !replyText.trim()}
                    >
                      <Send size={16} />
                      {sendingMessage ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="elite-modal-footer">
              <button className="elite-btn elite-btn-secondary" onClick={closeModal} disabled={savingStatus}>
                Cancel
              </button>
              <button className="elite-btn elite-btn-primary" onClick={handleSaveStatus} disabled={savingStatus}>
                <Save size={18} />
                {savingStatus ? 'Applying...' : 'Save All Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DisputeManagement
