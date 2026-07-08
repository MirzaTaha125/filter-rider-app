import { useState, useEffect } from 'react'
import { X, Check, DollarSign, Building2, CreditCard, Clock, User, Loader2 } from 'lucide-react'
import { getPaymentApprovals, approvePayment, rejectPayment } from '../../../api'
import './PaymentApproval.css'

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const STATUS_TABS = ['PENDING', 'APPROVED', 'REJECTED']

function PaymentApproval() {
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState(null)
  const [adminNote, setAdminNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)

  useEffect(() => {
    loadApprovals(1)
  }, [statusFilter])

  const loadApprovals = async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const data = await getPaymentApprovals({ status: statusFilter, page: p, limit: 20 })
      const arr = Array.isArray(data) ? data : (data?.items ?? data?.data ?? [])
      const total = data?.total ?? data?.meta?.total ?? arr.length
      setApprovals(p === 1 ? arr : (prev) => [...prev, ...arr])
      setPage(p)
      setHasMore(arr.length === 20 && arr.length < total)
    } catch (e) {
      setError(e.message || 'Failed to load payment approvals')
    } finally {
      setLoading(false)
    }
  }

  const openModal = (approval) => {
    setSelectedApproval(approval)
    setAdminNote('')
    setIsModalOpen(true)
    setShowRejectConfirm(false)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedApproval(null)
    setShowRejectConfirm(false)
    setAdminNote('')
  }

  const handleApprove = async () => {
    setActionLoading(true)
    try {
      await approvePayment(selectedApproval.id, adminNote)
      setApprovals((prev) => prev.filter((a) => a.id !== selectedApproval.id))
      closeModal()
    } catch (e) {
      alert(e.message || 'Failed to approve')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    setActionLoading(true)
    try {
      await rejectPayment(selectedApproval.id, adminNote)
      setApprovals((prev) => prev.filter((a) => a.id !== selectedApproval.id))
      closeModal()
    } catch (e) {
      alert(e.message || 'Failed to reject')
    } finally {
      setActionLoading(false)
    }
  }

  const pendingCount = statusFilter === 'PENDING' ? approvals.length : null

  return (
    <div className="payment-approval">
      <div className="payment-approval-header">
        <div>
          <h1 className="payment-approval-title">Payment Approval</h1>
          <p className="payment-approval-subtitle">Review and approve pending payment requests</p>
        </div>
      </div>

      <div className="approvals-stats">
        <div className="stat-card">
          <div className="stat-label">{statusFilter} Requests</div>
          <div className="stat-value">{loading ? '—' : approvals.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Amount</div>
          <div className="stat-value">
            {loading ? '—' : <><span className="riyal-symbol">&#x20C1;</span>{fmt(approvals.reduce((s, a) => s + Number(a.amount || 0), 0))}</>}
          </div>
        </div>
      </div>

      <div className="approvals-card">
        <div className="card-header">
          <h3 className="card-title">{statusFilter} Approvals</h3>
          <div className="status-toggle">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                className={`toggle-btn ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="payment-error">{error}</div>}

        {loading && approvals.length === 0 ? (
          <div className="payment-loading"><Loader2 size={24} className="spin" /> Loading…</div>
        ) : approvals.length === 0 ? (
          <div className="empty-state">
            <DollarSign size={48} style={{ opacity: 0.3 }} />
            <p>No {statusFilter.toLowerCase()} approvals</p>
          </div>
        ) : (
          <div className="approvals-grid">
            {approvals.map((a) => {
              const providerName = a.provider?.name ?? a.provider?.full_name ?? a.provider?.email ?? `#${a.id?.slice(0, 8)}`
              const method = a.bank_account?.bank_name ?? a.payment_method ?? 'Bank Transfer'
              const timeAgo = a.created_at ? new Date(a.created_at).toLocaleDateString() : ''
              const statusLabel = a.status ?? statusFilter
              return (
                <div key={a.id} className="approval-card" onClick={() => openModal(a)}>
                  <div className="approval-card-header">
                    <div className="approval-icon-wrapper"><Building2 size={20} /></div>
                    <div className={`approval-status-badge ${statusLabel === 'APPROVED' ? 'approved' : statusLabel === 'REJECTED' ? 'rejected' : ''}`}>
                      {statusLabel}
                    </div>
                  </div>
                  <div className="approval-card-body">
                    <div className="approval-entity">{providerName}</div>
                    <div className="approval-meta">
                      <span className="approval-method">{method}</span>
                      <span className="approval-separator">•</span>
                      <span className="approval-time">{timeAgo}</span>
                    </div>
                  </div>
                  <div className="approval-card-footer">
                    <div className="approval-amount"><span className="riyal-symbol">&#x20C1;</span>{fmt(a.amount)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {hasMore && (
          <div style={{ textAlign: 'center', padding: '12px' }}>
            <button className="btn-filter" onClick={() => loadApprovals(page + 1)} disabled={loading}>
              {loading ? <Loader2 size={16} className="spin" /> : 'Load more'}
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedApproval && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content approval-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Payment Approval Details</h2>
              <button className="modal-close-btn" onClick={closeModal}><X size={24} /></button>
            </div>

            <div className="modal-body">
              <div className="approval-details-content">
                <div className="detail-section">
                  {[
                    { icon: <Building2 size={18} />, label: 'Provider', value: selectedApproval.provider?.name ?? selectedApproval.provider?.full_name ?? '—' },
                    { icon: <DollarSign size={18} />, label: 'Amount', value: <><span className="riyal-symbol">&#x20C1;</span>{fmt(selectedApproval.amount)}</>, className: 'amount-value' },
                    { icon: <CreditCard size={18} />, label: 'Bank', value: selectedApproval.bank_account?.bank_name ?? selectedApproval.payment_method ?? '—' },
                    { label: 'Account', value: selectedApproval.bank_account?.account_number ?? selectedApproval.bank_account?.iban ?? '—' },
                    { label: 'Reference', value: selectedApproval.reference_code ?? selectedApproval.id },
                    { icon: <Clock size={18} />, label: 'Requested', value: selectedApproval.created_at ? new Date(selectedApproval.created_at).toLocaleString() : '—' },
                  ].map((item, i) => (
                    <div key={i} className="detail-item">
                      <div className="detail-label">{item.icon}<span>{item.label}</span></div>
                      <div className={`detail-value ${item.className || ''}`}>{item.value}</div>
                    </div>
                  ))}
                  {selectedApproval.admin_note && (
                    <div className="detail-item">
                      <div className="detail-label"><span>Admin Note</span></div>
                      <div className="detail-value">{selectedApproval.admin_note}</div>
                    </div>
                  )}
                </div>
              </div>

              {(selectedApproval.status === 'PENDING' || !selectedApproval.status) && (
                <div style={{ marginTop: '12px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Admin Note (optional)
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={2}
                    placeholder="Add a note…"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px', resize: 'vertical', background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              {(selectedApproval.status === 'PENDING' || !selectedApproval.status) ? (
                <>
                  {showRejectConfirm ? (
                    <>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Confirm reject?</span>
                      <button className="btn-cancel-confirm" onClick={() => setShowRejectConfirm(false)}>Cancel</button>
                      <button className="btn-confirm-decline" onClick={handleReject} disabled={actionLoading}>
                        {actionLoading ? <Loader2 size={16} className="spin" /> : 'Confirm Reject'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-reject" onClick={() => setShowRejectConfirm(true)} disabled={actionLoading}>
                        <X size={18} /> Reject
                      </button>
                      <button className="btn-accept" onClick={handleApprove} disabled={actionLoading}>
                        {actionLoading ? <Loader2 size={16} className="spin" /> : <><Check size={18} /> Approve</>}
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="approved-info">
                  <div className="approved-detail">
                    <span className="approved-label">Status:</span>
                    <span className="approved-value">{selectedApproval.status}</span>
                  </div>
                  {selectedApproval.processed_at && (
                    <div className="approved-detail">
                      <span className="approved-label">Processed:</span>
                      <span className="approved-value">{new Date(selectedApproval.processed_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentApproval
