import { useEffect, useState } from 'react'
import { Loader2, Wallet } from 'lucide-react'
import { adminWalletTopup } from '../../api'
import './WalletTopupDialog.css'

/**
 * Manual admin wallet top-up. Credits the customer/provider wallet and posts
 * an immutable ADJUSTMENT row described as “From Super Admin for {reason}”.
 */
function WalletTopupDialog({
  open,
  ownerType,
  ownerId,
  ownerName,
  onClose,
  onSuccess,
}) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setAmount('')
    setReason('')
    setError('')
    setSubmitting(false)
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, submitting])

  if (!open) return null

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than 0')
      return
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Reason is required (min 3 characters)')
      return
    }

    setSubmitting(true)
    try {
      const result = await adminWalletTopup({
        owner_type: ownerType,
        owner_id: ownerId,
        amount: value,
        reason: reason.trim(),
      })
      onSuccess?.(result)
      onClose?.()
    } catch (err) {
      setError(err.message || 'Failed to top up wallet')
    } finally {
      setSubmitting(false)
    }
  }

  const audience = ownerType === 'PROVIDER' ? 'provider' : 'customer'

  return (
    <div className="wtd-overlay" onClick={() => !submitting && onClose?.()} role="presentation">
      <form
        className="wtd-dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label="Top up wallet"
      >
        <div className="wtd-icon"><Wallet size={22} /></div>
        <h2 className="wtd-title">Top up wallet</h2>
        <p className="wtd-sub">
          Credit {ownerName ? <strong>{ownerName}</strong> : `this ${audience}`}’s
          available balance. The ledger will record it as
          {' '}<em>From Super Admin for …</em> using the reason below.
        </p>

        <label className="wtd-field">
          <span>Amount (SAR)</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={submitting}
            autoFocus
            required
          />
        </label>

        <label className="wtd-field">
          <span>Reason</span>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Promotional credit for app launch"
            disabled={submitting}
            maxLength={500}
            required
          />
        </label>

        {error && <p className="wtd-error">{error}</p>}

        <div className="wtd-actions">
          <button
            type="button"
            className="wtd-btn wtd-btn--secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="wtd-btn wtd-btn--primary"
            disabled={submitting}
          >
            {submitting
              ? <><Loader2 size={15} className="spin" /> Crediting…</>
              : 'Top up'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default WalletTopupDialog
