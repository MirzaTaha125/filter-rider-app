import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, Gift, Users, UserCheck } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getRewardRule,
  createRewardRule,
  updateRewardRule,
} from '../../../api'
import '../adminForm.css'
import './RewardForm.css'

const EMPTY_FORM = {
  name: '',
  description: '',
  audience: 'CUSTOMER',
  trigger: 'SIGN_UP',
  threshold: '10',
  rewardAmount: '50',
  repeatMode: 'ONCE',
  maxGrants: '',
  validFrom: '',
  validTo: '',
  isActive: true,
}

function toDateInput(value) {
  return value ? String(value).slice(0, 10) : ''
}

function previewText(form) {
  const who = form.audience === 'PROVIDER' ? 'a provider' : 'a customer'
  const amount = form.rewardAmount === '' ? '…' : Number(form.rewardAmount)
  if (form.trigger === 'SIGN_UP') {
    return `When ${who} signs up, credit ${amount} SAR to their wallet.`
  }
  const n = form.threshold === '' ? '…' : Number(form.threshold)
  if (form.repeatMode === 'EVERY_N') {
    return `When ${who} completes every ${n} orders, credit ${amount} SAR.`
  }
  return `When ${who} completes ${n} order${n === 1 ? '' : 's'}, credit ${amount} SAR.`
}

function RewardForm() {
  const { rewardId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(rewardId)

  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    if (!isEdit) return
    setLoading(true)
    setLoadError('')
    try {
      const rule = await getRewardRule(rewardId)
      if (!rule?.id) {
        setLoadError('Reward rule not found')
        return
      }
      setForm({
        name: rule.name ?? '',
        description: rule.description ?? '',
        audience: rule.audience ?? 'CUSTOMER',
        trigger: rule.trigger ?? 'SIGN_UP',
        threshold: rule.threshold != null ? String(rule.threshold) : '10',
        rewardAmount: rule.reward_amount != null ? String(Number(rule.reward_amount)) : '',
        repeatMode: rule.repeat_mode ?? 'ONCE',
        maxGrants: rule.max_grants != null ? String(rule.max_grants) : '',
        validFrom: toDateInput(rule.valid_from),
        validTo: toDateInput(rule.valid_to),
        isActive: rule.is_active !== false,
      })
    } catch (err) {
      setLoadError(err.message || 'Failed to load reward rule')
    } finally {
      setLoading(false)
    }
  }, [rewardId, isEdit])

  useEffect(() => { load() }, [load])

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const validate = () => {
    if (!form.name.trim()) return 'Give this reward a name.'

    const amount = Number(form.rewardAmount)
    if (form.rewardAmount === '' || Number.isNaN(amount) || amount <= 0) {
      return 'Reward amount must be greater than 0.'
    }

    if (form.trigger === 'ORDERS_COMPLETED') {
      const n = Number(form.threshold)
      if (form.threshold === '' || !Number.isInteger(n) || n < 1) {
        return 'Order threshold must be a whole number of 1 or more.'
      }
    }

    if (form.maxGrants !== '') {
      const cap = Number(form.maxGrants)
      if (!Number.isInteger(cap) || cap < 1) {
        return 'Max grants per user must be a whole number of 1 or more.'
      }
    }

    if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
      return 'The “valid from” date cannot be after the “valid to” date.'
    }
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const message = validate()
    if (message) {
      setFormError(message)
      return
    }

    setSaving(true)
    setFormError('')
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      audience: form.audience,
      trigger: form.trigger,
      rewardAmount: form.rewardAmount,
      threshold: form.trigger === 'ORDERS_COMPLETED' ? form.threshold : undefined,
      repeatMode: form.trigger === 'SIGN_UP' ? 'ONCE' : form.repeatMode,
      maxGrants: form.maxGrants,
      validFrom: form.validFrom,
      validTo: form.validTo,
      isActive: form.isActive,
    }

    try {
      if (isEdit) {
        await updateRewardRule(rewardId, payload)
      } else {
        await createRewardRule(payload)
      }
      navigate('/admin/pricing/rewards')
    } catch (err) {
      setFormError(err.message || 'Failed to save reward')
      setSaving(false)
    }
  }

  const title = isEdit ? 'Edit Reward' : 'New Reward'
  const isOrders = form.trigger === 'ORDERS_COMPLETED'

  if (loading) {
    return (
      <div className="reward-form-page">
        <PageHeader title={title} />
        <div className="sf-state"><Loader2 size={32} className="spin" /><span>Loading…</span></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="reward-form-page">
        <PageHeader title={title} />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load reward</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate('/admin/pricing/rewards')}>
            Back to rewards
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="reward-form-page">
      <PageHeader
        title={title}
        subtitle="Credit a wallet when a customer or provider hits a rule you define."
      />

      <form className="sf-form" onSubmit={handleSubmit}>
        {formError && (
          <div className="sf-alert">
            <AlertTriangle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <section className="sf-card">
          <div className="sf-card-head">
            <h2>Who and when</h2>
            <p>Pick the audience and the event that unlocks the bonus.</p>
          </div>

          <div className="sf-field">
            <label htmlFor="rw-name">Name <span className="sf-req">*</span></label>
            <input
              id="rw-name"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Welcome bonus"
              disabled={saving}
            />
          </div>

          <div className="sf-field">
            <label htmlFor="rw-description">Description</label>
            <textarea
              id="rw-description"
              className="rw-textarea"
              rows={3}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Optional note for other admins"
              disabled={saving}
            />
          </div>

          <div className="sf-field">
            <label>Audience <span className="sf-req">*</span></label>
            <div className="rw-segment">
              <button
                type="button"
                className={`rw-segment-btn ${form.audience === 'CUSTOMER' ? 'is-active' : ''}`}
                onClick={() => setField('audience', 'CUSTOMER')}
                disabled={saving}
              >
                <Users size={16} /> Customers
              </button>
              <button
                type="button"
                className={`rw-segment-btn ${form.audience === 'PROVIDER' ? 'is-active' : ''}`}
                onClick={() => setField('audience', 'PROVIDER')}
                disabled={saving}
              >
                <UserCheck size={16} /> Providers
              </button>
            </div>
          </div>

          <div className="sf-field">
            <label>Trigger <span className="sf-req">*</span></label>
            <div className="rw-segment">
              <button
                type="button"
                className={`rw-segment-btn ${form.trigger === 'SIGN_UP' ? 'is-active' : ''}`}
                onClick={() => setField('trigger', 'SIGN_UP')}
                disabled={saving}
              >
                Sign-up
              </button>
              <button
                type="button"
                className={`rw-segment-btn ${form.trigger === 'ORDERS_COMPLETED' ? 'is-active' : ''}`}
                onClick={() => setField('trigger', 'ORDERS_COMPLETED')}
                disabled={saving}
              >
                Orders completed
              </button>
            </div>
            <span className="sf-hint">
              {form.trigger === 'SIGN_UP'
                ? 'Granted once, when the account is created.'
                : 'Granted when the completed-order count reaches the threshold.'}
            </span>
          </div>

          {isOrders && (
            <div className="sf-grid sf-grid--2">
              <div className="sf-field">
                <label htmlFor="rw-threshold">Order threshold <span className="sf-req">*</span></label>
                <input
                  id="rw-threshold"
                  type="number"
                  min="1"
                  step="1"
                  value={form.threshold}
                  onChange={(e) => setField('threshold', e.target.value)}
                  disabled={saving}
                />
                <span className="sf-hint">
                  {form.repeatMode === 'EVERY_N'
                    ? 'Granted each time this many orders are completed (10, 20, 30…).'
                    : 'Granted the first time this many orders are completed.'}
                </span>
              </div>
              <div className="sf-field">
                <label>Repeat</label>
                <div className="rw-segment">
                  <button
                    type="button"
                    className={`rw-segment-btn ${form.repeatMode === 'ONCE' ? 'is-active' : ''}`}
                    onClick={() => setField('repeatMode', 'ONCE')}
                    disabled={saving}
                  >
                    Once
                  </button>
                  <button
                    type="button"
                    className={`rw-segment-btn ${form.repeatMode === 'EVERY_N' ? 'is-active' : ''}`}
                    onClick={() => setField('repeatMode', 'EVERY_N')}
                    disabled={saving}
                  >
                    Every N
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="sf-card">
          <div className="sf-card-head">
            <h2>Reward</h2>
            <p>How much to credit, and optional limits.</p>
          </div>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="rw-amount">Amount (SAR) <span className="sf-req">*</span></label>
              <div className="sf-input-affix">
                <span className="sf-affix riyal-symbol">&#x20C1;</span>
                <input
                  id="rw-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.rewardAmount}
                  onChange={(e) => setField('rewardAmount', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="sf-field">
              <label htmlFor="rw-max">Max grants per user</label>
              <input
                id="rw-max"
                type="number"
                min="1"
                step="1"
                value={form.maxGrants}
                onChange={(e) => setField('maxGrants', e.target.value)}
                placeholder="Unlimited"
                disabled={saving}
              />
              <span className="sf-hint">Leave blank for no cap.</span>
            </div>
          </div>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="rw-from">Valid from</label>
              <input
                id="rw-from"
                type="date"
                value={form.validFrom}
                onChange={(e) => setField('validFrom', e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="sf-field">
              <label htmlFor="rw-to">Valid to</label>
              <input
                id="rw-to"
                type="date"
                value={form.validTo}
                onChange={(e) => setField('validTo', e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <label className="sf-toggle">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setField('isActive', e.target.checked)}
              disabled={saving}
            />
            <span className="sf-toggle-track"><span className="sf-toggle-thumb" /></span>
            <span className="sf-toggle-copy">
              <strong>Active</strong>
              <em>Inactive rules are kept but never granted.</em>
            </span>
          </label>
        </section>

        <aside className="rw-preview">
          <Gift size={18} />
          <p>{previewText(form)}</p>
        </aside>

        <div className="sf-actions">
          <button
            type="button"
            className="sf-btn sf-btn--secondary"
            onClick={() => navigate('/admin/pricing/rewards')}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="sf-btn sf-btn--primary" disabled={saving}>
            {saving
              ? <><Loader2 size={16} className="spin" /> Saving…</>
              : isEdit ? 'Save reward' : 'Create reward'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default RewardForm
