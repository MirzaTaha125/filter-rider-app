import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2, AlertTriangle, Check, X, Building2, User, CreditCard, Clock, Hash,
} from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import { getPaymentApproval, approvePayment, rejectPayment } from '../../../api'
import {
  ACTIONABLE_STATUSES,
  providerName,
  bankLabel,
  accountLabel,
  formatMoney,
  formatDate,
  statusTone,
} from './withdrawals.js'
import '../adminForm.css'
import './PaymentApprovalDetail.css'

function PaymentApprovalDetail() {
  const { approvalId } = useParams()
  const navigate = useNavigate()

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [pending, setPending] = useState('') // '' | 'approve' | 'reject'
  const [confirming, setConfirming] = useState('') // '' | 'approve' | 'reject'

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await getPaymentApproval(approvalId)
      if (!data?.id) {
        setLoadError('Payment approval request not found')
        return
      }
      setItem(data)
    } catch (err) {
      setLoadError(err.message || 'Failed to load payment approval')
    } finally {
      setLoading(false)
    }
  }, [approvalId])

  useEffect(() => { load() }, [load])

  const canAct = item && ACTIONABLE_STATUSES.includes(item.status)

  const runAction = async (kind) => {
    // The API requires a reason on reject; approve's note is genuinely optional.
    if (kind === 'reject' && !adminNote.trim()) {
      setActionError('A reason is required when rejecting a withdrawal.')
      setConfirming('')
      return
    }

    setPending(kind)
    setActionError('')
    try {
      if (kind === 'approve') {
        await approvePayment(approvalId, adminNote.trim())
      } else {
        await rejectPayment(approvalId, adminNote.trim())
      }
      navigate('/admin/wallet/payment-approval')
    } catch (err) {
      setActionError(err.message || `Failed to ${kind} this withdrawal`)
      setPending('')
      setConfirming('')
    }
  }

  if (loading) {
    return (
      <div className="approval-detail-page">
        <PageHeader title="Payment Approval" />
        <div className="sf-state"><Loader2 size={32} className="spin" /><span>Loading…</span></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="approval-detail-page">
        <PageHeader title="Payment Approval" />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load request</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate('/admin/wallet/payment-approval')}>
            Back to payment approvals
          </button>
        </div>
      </div>
    )
  }

  const rows = [
    { icon: <User size={16} />, label: 'Provider', value: providerName(item) },
    { icon: <Hash size={16} />, label: 'Request no.', value: item.request_no ?? '—' },
    { icon: <Building2 size={16} />, label: 'Bank', value: bankLabel(item) },
    { icon: <CreditCard size={16} />, label: 'Account', value: accountLabel(item) },
    {
      label: 'Account holder',
      value: item.bankAccount?.account_holder_name ?? '—',
    },
    { icon: <Clock size={16} />, label: 'Requested', value: formatDate(item.requested_at, true) },
    ...(item.reviewed_at ? [{ label: 'Reviewed', value: formatDate(item.reviewed_at, true) }] : []),
    ...(item.paid_at ? [{ label: 'Paid', value: formatDate(item.paid_at, true) }] : []),
  ]

  return (
    <div className="approval-detail-page">
      <PageHeader
        title="Payment Approval"
        subtitle={`${providerName(item)} · ${item.request_no ?? ''}`.trim()}
      />

      {actionError && (
        <div className="sf-alert">
          <AlertTriangle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      <div className="pa-layout">
        <div className="pa-main">
          <section className="sf-card">
            <header className="sf-card-head">
              <h2>Request</h2>
              <p>Withdrawal submitted by the provider from their wallet balance.</p>
            </header>

            <div className="pa-amount">
              <span className="pa-amount-label">Amount requested</span>
              <span className="pa-amount-value">
                <span className="riyal-symbol">&#x20C1;</span>{formatMoney(item.amount)}
                <em>{item.currency ?? 'SAR'}</em>
              </span>
            </div>

            <dl className="pa-rows">
              {rows.map((row) => (
                <div key={row.label} className="pa-row">
                  <dt>{row.icon}<span>{row.label}</span></dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>

            {item.note && (
              <div className="pa-note">
                <span className="pa-note-label">Provider’s note</span>
                <p>{item.note}</p>
              </div>
            )}

            {item.admin_note && (
              <div className="pa-note pa-note--admin">
                <span className="pa-note-label">Admin note</span>
                <p>{item.admin_note}</p>
              </div>
            )}
          </section>

          {Array.isArray(item.transactions) && item.transactions.length > 0 && (
            <section className="sf-card">
              <header className="sf-card-head">
                <h2>Wallet transactions</h2>
                <p>Ledger entries linked to this withdrawal.</p>
              </header>

              <div className="pa-tx-wrap">
                <table className="pa-tx">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.transactions.map(tx => (
                      <tr key={tx.id}>
                        <td>{tx.type ?? '—'}</td>
                        <td>
                          <span className="riyal-symbol">&#x20C1;</span>{formatMoney(tx.amount)}
                        </td>
                        <td>{formatDate(tx.created_at, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <aside className="pa-side">
          <section className="sf-card">
            <header className="sf-card-head">
              <h2>Decision</h2>
              <p>{canAct
                ? 'Approving releases the funds; rejecting returns them to the provider’s balance.'
                : 'This request has already been reviewed.'}</p>
            </header>

            <div className="pa-status-block">
              <span className="pa-status-label">Status</span>
              <span className={`pa-badge pa-badge--${statusTone(item.status)}`}>{item.status}</span>
            </div>

            {canAct ? (
              <>
                <div className="sf-field">
                  <label htmlFor="adminNote">
                    Admin note {confirming === 'reject' && <span className="sf-req">*</span>}
                  </label>
                  <textarea
                    id="adminNote"
                    className="pa-textarea"
                    rows={4}
                    placeholder="Reason or reference…"
                    value={adminNote}
                    onChange={(e) => { setAdminNote(e.target.value); setActionError('') }}
                    disabled={Boolean(pending)}
                  />
                  <span className="sf-hint">Optional when approving, required when rejecting.</span>
                </div>

                {confirming ? (
                  <div className="pa-confirm">
                    <p>
                      {confirming === 'approve'
                        ? <>Approve <strong><span className="riyal-symbol">&#x20C1;</span>{formatMoney(item.amount)}</strong> to {providerName(item)}?</>
                        : <>Reject this withdrawal? The provider will be notified.</>}
                    </p>
                    <div className="pa-confirm-actions">
                      <button
                        className="sf-btn sf-btn--secondary"
                        onClick={() => setConfirming('')}
                        disabled={Boolean(pending)}
                      >
                        Cancel
                      </button>
                      <button
                        className={`sf-btn ${confirming === 'approve' ? 'pa-btn--approve' : 'pa-btn--reject'}`}
                        onClick={() => runAction(confirming)}
                        disabled={Boolean(pending)}
                      >
                        {pending
                          ? <><Loader2 size={16} className="spin" /> Working…</>
                          : confirming === 'approve' ? 'Confirm approve' : 'Confirm reject'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pa-actions">
                    <button
                      className="sf-btn pa-btn--reject"
                      onClick={() => setConfirming('reject')}
                      disabled={Boolean(pending)}
                    >
                      <X size={16} /> Reject
                    </button>
                    <button
                      className="sf-btn pa-btn--approve"
                      onClick={() => setConfirming('approve')}
                      disabled={Boolean(pending)}
                    >
                      <Check size={16} /> Approve
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                className="sf-btn sf-btn--secondary"
                onClick={() => navigate('/admin/wallet/payment-approval')}
              >
                Back to list
              </button>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

export default PaymentApprovalDetail
