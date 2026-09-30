import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, Search, ArrowLeft } from 'lucide-react'
import {
  createPenalty,
  searchCompletedOrdersForPenalty,
  getWalletRules,
} from '../../../api'
import { formatMoney } from './withdrawals.js'
import './PaymentApproval.css'
import './Penalties.css'

function ApplyPenalty() {
  const navigate = useNavigate()
  const [orderQuery, setOrderQuery] = useState('')
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [penaltyAmount, setPenaltyAmount] = useState('')
  const [rewardAmount, setRewardAmount] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [defaultPercent, setDefaultPercent] = useState(50)
  const debounceRef = useRef(null)

  useEffect(() => {
    getWalletRules()
      .then((rules) => {
        if (rules?.penalty_to_customer_percent != null) {
          setDefaultPercent(Number(rules.penalty_to_customer_percent))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setOrdersLoading(true)
      searchCompletedOrdersForPenalty(orderQuery)
        .then((data) => setOrders(Array.isArray(data) ? data : []))
        .catch(() => setOrders([]))
        .finally(() => setOrdersLoading(false))
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [orderQuery])

  const onPenaltyChange = (val) => {
    setPenaltyAmount(val)
    const n = Number(val)
    if (Number.isFinite(n) && n > 0 && !rewardAmount) {
      setRewardAmount(((n * defaultPercent) / 100).toFixed(2))
    }
  }

  const goBack = () => navigate('/admin/wallet/penalties')

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!selected) {
      setFormError('Select a completed order')
      return
    }
    const penalty = Number(penaltyAmount)
    const reward = Number(rewardAmount || 0)
    if (!Number.isFinite(penalty) || penalty <= 0) {
      setFormError('Penalty amount must be greater than 0')
      return
    }
    if (reward > penalty) {
      setFormError('Customer reward cannot exceed penalty')
      return
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setFormError('Reason is required (min 3 characters)')
      return
    }

    setSubmitting(true)
    try {
      await createPenalty({
        order_id: selected.id,
        penalty_amount: penalty,
        customer_reward_amount: reward,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      })
      goBack()
    } catch (err) {
      setFormError(err.message || 'Failed to create penalty')
    } finally {
      setSubmitting(false)
    }
  }

  const retained = Math.max(0, Number(penaltyAmount || 0) - Number(rewardAmount || 0))

  return (
    <div className="payment-approval penalties-page apply-penalty-page">
      <header className="dt-page-head">
        <div>
          <button type="button" className="penalties-back-btn" onClick={goBack}>
            <ArrowLeft size={16} /> Back to Penalties
          </button>
          <p className="dt-page-sub">
            Select a completed order, set the rider penalty and optional customer reward, then apply.
          </p>
        </div>
      </header>

      <form className="penalties-form penalties-form--page" onSubmit={submit}>
        <label>
          Search completed order
          <div className="penalties-search">
            <Search size={16} />
            <input
              type="search"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="Order no, rider, or customer…"
            />
          </div>
        </label>

        <div className="penalties-order-list penalties-order-list--page">
          {ordersLoading && (
            <div className="dt-empty">
              <Loader2 size={16} className="spin" /> Searching…
            </div>
          )}
          {!ordersLoading && orders.length === 0 && (
            <div className="dt-empty">No completed orders match.</div>
          )}
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`penalties-order-row ${selected?.id === o.id ? 'is-selected' : ''}`}
              onClick={() => setSelected(o)}
            >
              <strong>{o.order_no}</strong>
              <span>
                {o.provider?.user?.full_name || '—'} → {o.customer?.user?.full_name || '—'}
              </span>
              <span>{formatMoney(o.total_price)}</span>
            </button>
          ))}
        </div>

        {selected && (
          <p className="penalties-selected">
            Selected: <strong>{selected.order_no}</strong>
          </p>
        )}

        <div className="penalties-form-row">
          <label>
            Rider penalty (SAR)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={penaltyAmount}
              onChange={(e) => onPenaltyChange(e.target.value)}
              required
            />
          </label>
          <label>
            Customer reward (SAR)
            <input
              type="number"
              min="0"
              step="0.01"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
            />
          </label>
        </div>

        <p className="penalties-retained">
          Platform retained: <strong>{formatMoney(retained)}</strong>
        </p>

        <label>
          Reason
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            required
          />
        </label>

        <label>
          Notes (optional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            maxLength={2000}
          />
        </label>

        {formError && (
          <div className="pv-alert">
            <AlertTriangle size={16} />
            {formError}
          </div>
        )}

        <div className="penalties-form-actions">
          <button type="button" className="penalties-cancel-btn" onClick={goBack}>
            Cancel
          </button>
          <button type="submit" className="penalties-apply-btn" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="spin" /> : 'Apply'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ApplyPenalty
