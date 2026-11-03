import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, Gift, Users, UserCheck, Check, Percent, CircleDollarSign } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getRewardRule,
  createRewardRule,
  updateRewardRule,
  getServices,
} from '../../../api'
import '../adminForm.css'
import './RewardForm.css'
import { PageShimmer } from '../../../components/Shimmer/Shimmer'
import ArabicField from '../../../components/ArabicField/ArabicField'
import ImageUploadField from '../../../components/ImageUpload/ImageUploadField'

const CARD_COLORS = ['#FFF3C4', '#D9F5E5', '#FDE3D0', '#E7E0FB', '#D9EEFB']

const EMPTY_FORM = {
  name: '',
  nameAr: '',
  description: '',
  descriptionAr: '',
  audience: 'CUSTOMER',
  trigger: 'SIGN_UP',
  threshold: '10',
  rewardKind: 'WALLET',
  rewardAmount: '50',
  discountType: 'PERCENTAGE',
  discountValue: '20',
  selectedServiceIds: [],
  repeatMode: 'ONCE',
  maxGrants: '',
  validFrom: '',
  validTo: '',
  isActive: true,
  cardColor: '#FFF3C4',
  iconUrl: '',
}

function toDateInput(value) {
  return value ? String(value).slice(0, 10) : ''
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function previewText(form) {
  const who = form.audience === 'PROVIDER' ? 'a provider' : 'a customer'
  const isDiscount = form.rewardKind === 'SERVICE_DISCOUNT'
  const count = form.selectedServiceIds?.length || 0
  const discountLabel = form.discountType === 'FIXED'
    ? `${form.discountValue === '' ? '…' : Number(form.discountValue)} SAR off`
    : `${form.discountValue === '' ? '…' : Number(form.discountValue)}% off`
  const rewardBit = isDiscount
    ? `give ${discountLabel} on ${count || 'selected'} service${count === 1 ? '' : 's'}`
    : `credit ${form.rewardAmount === '' ? '…' : Number(form.rewardAmount)} SAR to their wallet`

  if (form.trigger === 'SIGN_UP') {
    return `When ${who} signs up, ${rewardBit}.`
  }
  const n = form.threshold === '' ? '…' : Number(form.threshold)
  if (form.repeatMode === 'EVERY_N') {
    return `When ${who} completes every ${n} orders, ${rewardBit}.`
  }
  return `When ${who} completes ${n} order${n === 1 ? '' : 's'}, ${rewardBit}.`
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
  const [services, setServices] = useState([])

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
        nameAr: rule.name_ar ?? '',
        description: rule.description ?? '',
        descriptionAr: rule.description_ar ?? '',
        audience: rule.audience ?? 'CUSTOMER',
        trigger: rule.trigger ?? 'SIGN_UP',
        threshold: rule.threshold != null ? String(rule.threshold) : '10',
        rewardKind: rule.reward_kind ?? 'WALLET',
        rewardAmount: rule.reward_amount != null ? String(Number(rule.reward_amount)) : '',
        discountType: rule.discount_type ?? 'PERCENTAGE',
        discountValue: rule.discount_value != null ? String(Number(rule.discount_value)) : '20',
        selectedServiceIds: toArray(rule.service_ids),
        repeatMode: rule.repeat_mode ?? 'ONCE',
        maxGrants: rule.max_grants != null ? String(rule.max_grants) : '',
        validFrom: toDateInput(rule.valid_from),
        validTo: toDateInput(rule.valid_to),
        isActive: rule.is_active !== false,
        cardColor: rule.card_color || '#FFF3C4',
        iconUrl: rule.icon_url || '',
      })
    } catch (err) {
      setLoadError(err.message || 'Failed to load reward rule')
    } finally {
      setLoading(false)
    }
  }, [rewardId, isEdit])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    getServices(null, true)
      .then((list) => setServices(toArray(list)))
      .catch(() => setServices([]))
  }, [])

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const validate = () => {
    if (!(form.name ?? '').trim()) return 'Give this reward a name.'

    if (form.rewardKind === 'SERVICE_DISCOUNT') {
      if (!form.selectedServiceIds.length) return 'Pick at least one service for the discount.'
      const discount = Number(form.discountValue)
      if (form.discountValue === '' || Number.isNaN(discount) || discount <= 0) {
        return 'Discount value must be greater than 0.'
      }
      if (form.discountType === 'PERCENTAGE' && discount > 100) {
        return 'Percentage discount cannot exceed 100.'
      }
    } else {
      const amount = Number(form.rewardAmount)
      if (form.rewardAmount === '' || Number.isNaN(amount) || amount <= 0) {
        return 'Reward amount must be greater than 0.'
      }
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
      name: (form.name ?? '').trim(),
      nameAr: (form.nameAr ?? '').trim(),
      description: (form.description ?? '').trim(),
      descriptionAr: (form.descriptionAr ?? '').trim(),
      audience: form.audience,
      trigger: form.trigger,
      rewardKind: form.rewardKind,
      rewardAmount: form.rewardAmount,
      discountType: form.discountType,
      discountValue: form.discountValue,
      serviceIds: form.selectedServiceIds,
      threshold: form.trigger === 'ORDERS_COMPLETED' ? form.threshold : undefined,
      repeatMode: form.trigger === 'SIGN_UP' ? 'ONCE' : form.repeatMode,
      maxGrants: form.maxGrants,
      validFrom: form.validFrom,
      validTo: form.validTo,
      isActive: form.isActive,
      cardColor: form.cardColor,
      iconUrl: form.iconUrl,
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
        <PageShimmer />
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
        subtitle="Credit a wallet, or give a service discount, when a customer or provider hits a rule you define."
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

          <ArabicField
            id="rw-name-ar"
            label="Name"
            placeholder="مثال: مكافأة الترحيب"
            value={form.nameAr}
            onChange={(value) => setField('nameAr', value)}
            disabled={saving}
            maxLength={120}
          />

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

          <ArabicField
            id="rw-description-ar"
            label="Description"
            placeholder="وصف اختياري"
            value={form.descriptionAr}
            onChange={(value) => setField('descriptionAr', value)}
            disabled={saving}
            maxLength={500}
            multiline
          />

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
                onClick={() => {
                  setField('audience', 'PROVIDER')
                  if (form.rewardKind === 'SERVICE_DISCOUNT') setField('rewardKind', 'WALLET')
                }}
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
            <p>Wallet credit, or a discount on selected services.</p>
          </div>

          <div className="sf-field">
            <label>Type <span className="sf-req">*</span></label>
            <div className="rw-segment">
              <button
                type="button"
                className={`rw-segment-btn ${form.rewardKind === 'WALLET' ? 'is-active' : ''}`}
                onClick={() => setField('rewardKind', 'WALLET')}
                disabled={saving}
              >
                Amount
              </button>
              <button
                type="button"
                className={`rw-segment-btn ${form.rewardKind === 'SERVICE_DISCOUNT' ? 'is-active' : ''}`}
                onClick={() => setField('rewardKind', 'SERVICE_DISCOUNT')}
                disabled={saving || form.audience === 'PROVIDER'}
                title={form.audience === 'PROVIDER' ? 'Service discounts are for customers' : undefined}
              >
                Service discount
              </button>
            </div>
            {form.audience === 'PROVIDER' && (
              <span className="sf-hint">Service discounts apply on customer bookings only.</span>
            )}
          </div>

          {form.rewardKind === 'WALLET' ? (
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
          ) : (
            <>
              <div className="sf-grid sf-grid--2">
                <div className="sf-field">
                  <label>Discount type <span className="sf-req">*</span></label>
                  <div className="rw-segment">
                    <button
                      type="button"
                      className={`rw-segment-btn ${form.discountType === 'PERCENTAGE' ? 'is-active' : ''}`}
                      onClick={() => setField('discountType', 'PERCENTAGE')}
                      disabled={saving}
                    >
                      <Percent size={15} /> Percent
                    </button>
                    <button
                      type="button"
                      className={`rw-segment-btn ${form.discountType === 'FIXED' ? 'is-active' : ''}`}
                      onClick={() => setField('discountType', 'FIXED')}
                      disabled={saving}
                    >
                      <CircleDollarSign size={15} /> Amount (SAR)
                    </button>
                  </div>
                </div>
                <div className="sf-field">
                  <label htmlFor="rw-discount">
                    {form.discountType === 'FIXED' ? 'Discount (SAR)' : 'Discount (%)'} <span className="sf-req">*</span>
                  </label>
                  <input
                    id="rw-discount"
                    type="number"
                    min="0.01"
                    max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
                    step="0.01"
                    value={form.discountValue}
                    onChange={(e) => setField('discountValue', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="sf-field">
                <label>
                  Services <span className="sf-req">*</span>
                  {form.selectedServiceIds.length > 0 && (
                    <span className="rw-selected">{form.selectedServiceIds.length} selected</span>
                  )}
                </label>
                {services.length === 0 ? (
                  <p className="rw-empty">No services found.</p>
                ) : (
                  <div className="rw-pills">
                    {services.map((svc) => {
                      const on = form.selectedServiceIds.includes(svc.id)
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          className={`rw-pill ${on ? 'is-on' : ''}`}
                          onClick={() => {
                            setField(
                              'selectedServiceIds',
                              on
                                ? form.selectedServiceIds.filter((id) => id !== svc.id)
                                : [...form.selectedServiceIds, svc.id],
                            )
                          }}
                          disabled={saving}
                          aria-pressed={on}
                        >
                          {on && <Check size={13} />}
                          {svc.name_en}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="sf-grid sf-grid--2">
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

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label>Card color</label>
              <div className="rw-colors">
                {CARD_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`rw-color ${form.cardColor?.toUpperCase() === color ? 'is-active' : ''}`}
                    style={{ background: color }}
                    onClick={() => setField('cardColor', color)}
                    disabled={saving}
                    aria-label={color}
                  />
                ))}
                <input
                  type="color"
                  className="rw-color-input"
                  value={/^#[0-9A-Fa-f]{6}$/.test(form.cardColor || '') ? form.cardColor : '#FFF3C4'}
                  onChange={(e) => setField('cardColor', e.target.value.toUpperCase())}
                  disabled={saving}
                  aria-label="Custom card color"
                />
              </div>
              <span className="sf-hint">This color is used on the customer reward card.</span>
            </div>
            <ImageUploadField
              label="Card icon"
              folder="rewards"
              value={form.iconUrl || null}
              onChange={(url) => setField('iconUrl', url || '')}
              disabled={saving}
              hint="Shown on the right of the reward card. Leave empty for the default gift."
            />
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
