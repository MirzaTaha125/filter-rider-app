import { useEffect, useState } from 'react'
import { Loader2, AlertTriangle, Save } from 'lucide-react'
import { getWalletRules, updateWalletRules } from '../../../api'
import './PaymentApproval.css'
import './Penalties.css'

const FIELDS = [
  {
    key: 'min_withdraw_amount',
    label: 'Min withdrawal amount (SAR)',
    type: 'number',
    hint: 'Riders cannot request less than this.',
  },
  {
    key: 'min_wallet_balance_to_accept',
    label: 'Min balance to accept orders (SAR)',
    type: 'number',
    hint: 'Effective available balance required before accept.',
  },
  {
    key: 'min_rating_to_full_visibility',
    label: 'Min rating for full visibility',
    type: 'number',
    step: '0.1',
    hint: 'Below this rating, broadcast visibility is reduced.',
  },
  {
    key: 'low_rating_visibility_percent',
    label: 'Low-rating visibility %',
    type: 'number',
    hint: 'Chance a REDUCED rider is included in an order broadcast.',
  },
  {
    key: 'penalty_to_customer_percent',
    label: 'Default customer reward % of penalty',
    type: 'number',
    hint: 'UI helper when applying a penalty — not forced math.',
  },
  {
    key: 'max_active_penalties',
    label: 'Max active penalties per rider',
    type: 'number',
    hint: 'Blocks new penalties when the rider is at the cap.',
  },
]

function WalletRules() {
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getWalletRules()
      .then((data) => setForm(data))
      .catch((e) => setError(e.message || 'Failed to load wallet rules'))
      .finally(() => setLoading(false))
  }, [])

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        min_withdraw_amount: Number(form.min_withdraw_amount),
        min_wallet_balance_to_accept: Number(form.min_wallet_balance_to_accept),
        min_rating_to_full_visibility: Number(form.min_rating_to_full_visibility),
        low_rating_visibility_percent: Number(form.low_rating_visibility_percent),
        penalty_auto_apply: Boolean(form.penalty_auto_apply),
        penalty_to_customer_reward: Boolean(form.penalty_to_customer_reward),
        penalty_to_customer_percent: Number(form.penalty_to_customer_percent),
        max_active_penalties: Number(form.max_active_penalties),
      }
      const updated = await updateWalletRules(payload)
      setForm(updated)
      setSaved(true)
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="payment-approval">
        <div className="dt-empty"><Loader2 size={18} className="spin" /> Loading wallet rules…</div>
      </div>
    )
  }

  return (
    <div className="payment-approval">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">
            Thresholds for withdrawals, accept eligibility, rating visibility, and penalties. Changes apply immediately — no deploy needed.
          </p>
        </div>
      </header>

      {error && (
        <div className="pv-alert">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {form && (
        <form className="wallet-rules-form" onSubmit={save}>
          <div className="wallet-rules-grid">
            {FIELDS.map((field) => (
              <div key={field.key} className="wallet-rules-field">
                <label htmlFor={field.key}>{field.label}</label>
                <input
                  id={field.key}
                  type="number"
                  step={field.step || '1'}
                  value={form[field.key] ?? ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                />
                <p className="wallet-rules-hint">{field.hint}</p>
              </div>
            ))}
          </div>

          <label className="wallet-rules-check">
            <input
              type="checkbox"
              checked={Boolean(form.penalty_auto_apply)}
              onChange={(e) => setField('penalty_auto_apply', e.target.checked)}
            />
            Auto-apply penalties (skip PENDING approval)
          </label>

          <label className="wallet-rules-check">
            <input
              type="checkbox"
              checked={Boolean(form.penalty_to_customer_reward)}
              onChange={(e) => setField('penalty_to_customer_reward', e.target.checked)}
            />
            Allow customer reward credits from penalties
          </label>

          <div className="penalties-form-actions">
            {saved && <span className="wallet-rules-hint">Saved.</span>}
            <button type="submit" className="penalties-apply-btn" disabled={saving}>
              {saving ? <Loader2 size={16} className="spin" /> : <><Save size={16} /> Save rules</>}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default WalletRules
