import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2, AlertTriangle, Send, User, Package, Shield, Paperclip, Check,
} from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import { getDispute, updateDisputeStatus, addDisputeMessage } from '../../../api/disputes.js'
import {
  DISPUTE_STATUSES,
  STATUS_LABELS,
  enumLabel,
  statusTone,
  partyName,
  formatDate,
  attachments,
} from './disputes.js'
import '../adminForm.css'
import './DisputeDetail.css'

const SENDER_ICONS = { CUSTOMER: User, PROVIDER: Package, ADMIN: Shield }
const SENDER_LABELS = { CUSTOMER: 'Customer', PROVIDER: 'Service provider', ADMIN: 'Admin' }

function DisputeDetail() {
  const { disputeId } = useParams()
  const navigate = useNavigate()

  const [dispute, setDispute] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')

  const [statusDraft, setStatusDraft] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  const [reply, setReply] = useState('')
  const [internalNote, setInternalNote] = useState(false)
  const [sending, setSending] = useState(false)

  const threadRef = useRef(null)

  /**
   * Scroll the thread box itself rather than using scrollIntoView — that walks
   * up and scrolls every scrollable ancestor, and the app shell counts as one
   * (overflow:hidden is still programmatically scrollable), which drags the
   * sidebar and topbar off-screen with no scrollbar to get back.
   */
  const scrollThreadToBottom = () => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await getDispute(disputeId)
      if (!data?.id) {
        setLoadError('Dispute not found')
        return
      }
      setDispute(data)
      setStatusDraft(data.status)
    } catch (err) {
      setLoadError(err.message || 'Failed to load dispute')
    } finally {
      setLoading(false)
    }
  }, [disputeId])

  useEffect(() => { load() }, [load])

  const handleSaveStatus = async () => {
    if (!dispute || statusDraft === dispute.status) return
    setSavingStatus(true)
    setActionError('')
    try {
      const updated = await updateDisputeStatus(disputeId, statusDraft)
      setDispute(updated)
      setStatusDraft(updated.status)
    } catch (err) {
      setActionError(err.message || 'Failed to update status')
    } finally {
      setSavingStatus(false)
    }
  }

  const handleSend = async () => {
    const text = reply.trim()
    if (!text) return
    setSending(true)
    setActionError('')
    try {
      const updated = await addDisputeMessage(disputeId, text, internalNote)
      setDispute(updated)
      setReply('')
      setInternalNote(false)
      setTimeout(scrollThreadToBottom, 50)
    } catch (err) {
      setActionError(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="dispute-detail-page">
        <PageHeader title="Dispute" />
        <div className="sf-state"><Loader2 size={32} className="spin" /><span>Loading…</span></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="dispute-detail-page">
        <PageHeader title="Dispute" />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load dispute</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate('/admin/disputes')}>
            Back to disputes
          </button>
        </div>
      </div>
    )
  }

  const files = attachments(dispute)
  const messages = Array.isArray(dispute.messages) ? dispute.messages : []
  const statusDirty = statusDraft !== dispute.status

  return (
    <div className="dispute-detail-page">
      <PageHeader
        title={dispute.dispute_code}
        subtitle={`${enumLabel(dispute.type)} · opened ${formatDate(dispute.created_at)}`}
      />

      {actionError && (
        <div className="sf-alert">
          <AlertTriangle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      <div className="dd-layout">
        <div className="dd-main">
          <section className="sf-card">
            <header className="sf-card-head">
              <h2>Incident</h2>
              <p>What the complaint is about.</p>
            </header>

            <dl className="dd-rows">
              <div className="dd-row">
                <dt>Order</dt>
                <dd>{dispute.order?.order_no || '—'}</dd>
              </div>
              <div className="dd-row">
                <dt>Type</dt>
                <dd>{enumLabel(dispute.type)}</dd>
              </div>
              <div className="dd-row">
                <dt>Last activity</dt>
                <dd>{formatDate(dispute.updated_at, true)}</dd>
              </div>
            </dl>

            <div className="dd-block">
              <span className="dd-block-label">Reason</span>
              <p>{dispute.reason || 'No reason given.'}</p>
            </div>

            {dispute.description && (
              <div className="dd-block">
                <span className="dd-block-label">Description</span>
                <p>{dispute.description}</p>
              </div>
            )}

            {files.length > 0 && (
              <div className="dd-block">
                <span className="dd-block-label">
                  <Paperclip size={13} /> Evidence ({files.length})
                </span>
                <div className="dd-attachments">
                  {files.map((url, i) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dd-attachment"
                      title="Open in a new tab"
                    >
                      <img src={url} alt={`Attachment ${i + 1}`} loading="lazy" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="sf-card dd-thread-card">
            <header className="sf-card-head">
              <h2>Messages</h2>
              <p>Internal notes are visible to admins only.</p>
            </header>

            <div className="dd-thread" ref={threadRef}>
              {messages.length === 0 ? (
                <p className="dd-thread-empty">No messages yet.</p>
              ) : (
                messages.map(msg => {
                  const Icon = SENDER_ICONS[msg.sender_type] ?? User
                  const fallback = SENDER_LABELS[msg.sender_type] ?? msg.sender_type
                  // The API now sends the sender's own name and role names, so
                  // an admin reply reads "Taha · CHAT DISPUTES MANAGER" rather
                  // than a generic "Admin".
                  const who = msg.sender_name
                    ?? (msg.sender_type === 'CUSTOMER'
                      ? partyName(dispute.customer)
                      : msg.sender_type === 'PROVIDER'
                        ? partyName(dispute.provider)
                        : fallback)
                  const roles = Array.isArray(msg.sender_roles) ? msg.sender_roles : []
                  return (
                    <article
                      key={msg.id}
                      className={`dd-msg dd-msg--${(msg.sender_type || '').toLowerCase()} ${msg.is_internal_note ? 'is-internal' : ''}`}
                    >
                      <header className="dd-msg-head">
                        <span className="dd-msg-who"><Icon size={12} /> {who}</span>
                        {roles.length > 0 && (
                          <span className="dd-msg-roles">
                            {roles.map(role => (
                              <span key={role} className="dd-msg-role">{role}</span>
                            ))}
                          </span>
                        )}
                        <span className="dd-msg-time">{formatDate(msg.created_at, true)}</span>
                      </header>
                      <p className="dd-msg-body">{msg.message}</p>
                      {msg.is_internal_note && (
                        <span className="dd-msg-internal">Internal note</span>
                      )}
                    </article>
                  )
                })
              )}
            </div>

            <div className="dd-reply">
              <textarea
                className="dd-reply-input"
                rows={3}
                placeholder="Write a reply, or an internal note…"
                value={reply}
                onChange={(e) => { setReply(e.target.value); setActionError('') }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend()
                }}
                disabled={sending}
              />
              <div className="dd-reply-bar">
                <label className="dd-check">
                  <input
                    type="checkbox"
                    checked={internalNote}
                    onChange={(e) => setInternalNote(e.target.checked)}
                    disabled={sending}
                  />
                  <span className="dd-check-box">{internalNote && <Check size={12} />}</span>
                  Internal note
                </label>
                <button
                  className="sf-btn sf-btn--primary"
                  onClick={handleSend}
                  disabled={sending || !reply.trim()}
                >
                  {sending
                    ? <><Loader2 size={15} className="spin" /> Sending…</>
                    : <><Send size={15} /> Send</>}
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="dd-side">
          <section className="sf-card">
            <header className="sf-card-head">
              <h2>Status</h2>
              <p>Where this dispute stands.</p>
            </header>

            <div className="dd-status-current">
              <span className={`dd-badge dd-badge--${statusTone(dispute.status)}`}>
                {STATUS_LABELS[dispute.status] ?? dispute.status}
              </span>
            </div>

            <div className="sf-field">
              <label htmlFor="status">Change status</label>
              <select
                id="status"
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                disabled={savingStatus}
              >
                {DISPUTE_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <button
              className="sf-btn sf-btn--primary dd-status-save"
              onClick={handleSaveStatus}
              disabled={savingStatus || !statusDirty}
            >
              {savingStatus
                ? <><Loader2 size={15} className="spin" /> Saving…</>
                : statusDirty ? 'Update status' : 'No change'}
            </button>
          </section>

          <section className="sf-card">
            <header className="sf-card-head">
              <h2>Parties</h2>
            </header>

            {[
              { label: 'Customer', party: dispute.customer, icon: User },
              { label: 'Service provider', party: dispute.provider, icon: Package },
            ].map((entry) => {
              const Icon = entry.icon
              const { label, party } = entry
              return (
                <div key={label} className="dd-party">
                  <span className="dd-party-avatar">
                    {party?.user?.avatar
                      ? <img src={party.user.avatar} alt="" />
                      : <Icon size={17} />}
                  </span>
                  <span className="dd-party-info">
                    <span className="dd-party-role">{label}</span>
                    <strong>{partyName(party)}</strong>
                    {party?.user?.phone && <em>{party.user.phone}</em>}
                  </span>
                </div>
              )
            })}
          </section>
        </aside>
      </div>
    </div>
  )
}

export default DisputeDetail
