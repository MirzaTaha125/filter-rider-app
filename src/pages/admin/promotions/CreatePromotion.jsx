import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Loader2, AlertTriangle, Check, Percent, CircleDollarSign, Upload, X,
} from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  createPromotion, updatePromotion, getPromotion,
  getZones, getServices, uploadFile,
} from '../../../api'
import '../adminForm.css'
import './CreatePromotion.css'

const EMPTY_FORM = {
  code: '',
  title: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  maxDiscount: '',
  selectedZoneIds: [],
  selectedServiceIds: [],
  totalUsageLimit: '',
  limitPerUser: '',
  minOrderValue: '',
  validFrom: '',
  validTo: '',
  showOnHome: true,
  bannerBadge: '',
  bannerTitle: '',
  bannerSubtitle: '',
  bannerImageUrl: '',
  bannerSortOrder: '0',
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function toDateInput(value) {
  return value ? String(value).slice(0, 10) : ''
}

function CreatePromotion() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY_FORM)
  const [zones, setZones] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [zoneData, serviceData, promo] = await Promise.all([
        getZones({}).catch(() => []),
        getServices(null, true).catch(() => []),
        isEdit ? getPromotion(id) : Promise.resolve(null),
      ])

      setZones(toArray(zoneData))
      setServices(toArray(serviceData))

      if (isEdit) {
        if (!promo?.id) {
          setLoadError('Promotion not found')
          return
        }
        setForm({
          code: promo.code ?? '',
          title: promo.title ?? '',
          discountType: promo.discount_type ?? 'PERCENTAGE',
          discountValue: promo.discount_value != null ? String(Number(promo.discount_value)) : '',
          maxDiscount: promo.max_discount != null ? String(Number(promo.max_discount)) : '',
          selectedZoneIds: toArray(promo.zones).map(z => z.zone_id),
          selectedServiceIds: toArray(promo.services).map(s => s.service_id),
          totalUsageLimit: promo.total_usage_limit != null ? String(promo.total_usage_limit) : '',
          limitPerUser: promo.limit_per_user != null ? String(promo.limit_per_user) : '',
          minOrderValue: promo.min_order_value != null ? String(Number(promo.min_order_value)) : '',
          validFrom: toDateInput(promo.valid_from),
          validTo: toDateInput(promo.valid_to),
          showOnHome: Boolean(promo.show_on_home),
          bannerBadge: promo.banner_badge ?? '',
          bannerTitle: promo.banner_title ?? '',
          bannerSubtitle: promo.banner_subtitle ?? '',
          bannerImageUrl: promo.banner_image_url ?? '',
          bannerSortOrder: String(promo.banner_sort_order ?? 0),
        })
      }
    } catch (err) {
      setLoadError(err.message || 'Failed to load promotion')
    } finally {
      setLoading(false)
    }
  }, [id, isEdit])

  useEffect(() => { load() }, [load])

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const toggleIn = (field, value) => {
    setForm(prev => {
      const list = prev[field]
      return {
        ...prev,
        [field]: list.includes(value) ? list.filter(v => v !== value) : [...list, value],
      }
    })
  }

  const isPercentage = form.discountType === 'PERCENTAGE'

  /**
   * Only active services can be picked. A service that was already targeted and
   * has since been deactivated still shows (flagged), otherwise it would be an
   * invisible selection the admin could not remove.
   */
  const selectableServices = services.filter(
    svc => svc.is_active !== false || form.selectedServiceIds.includes(svc.id),
  )

  const validate = () => {
    if (!form.code.trim()) return 'Promo code is required.'

    const value = Number(form.discountValue)
    if (form.discountValue === '' || Number.isNaN(value) || value < 0) {
      return 'Discount value must be a number of 0 or more.'
    }
    if (isPercentage && value > 100) {
      return 'A percentage discount cannot be more than 100%.'
    }

    for (const [field, label] of [
      ['maxDiscount', 'Max discount cap'],
      ['minOrderValue', 'Minimum order value'],
    ]) {
      if (form[field] !== '' && Number(form[field]) < 0) return `${label} cannot be negative.`
    }

    for (const [field, label] of [
      ['totalUsageLimit', 'Total usage limit'],
      ['limitPerUser', 'Limit per user'],
    ]) {
      if (form[field] === '') continue
      const n = Number(form[field])
      if (!Number.isInteger(n) || n < 1) return `${label} must be a whole number of 1 or more.`
    }

    if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
      return 'The “valid from” date cannot be after the “valid to” date.'
    }
    return ''
  }

  const handleSubmit = async (action) => {
    const message = validate()
    if (message) {
      setFormError(message)
      return
    }

    setSaving(action)
    setFormError('')
    const code = form.code.trim().toUpperCase()
    const payload = {
      code,
      title: form.title.trim() || code,
      discountType: form.discountType,
      discountValue: form.discountValue,
      maxDiscount: form.maxDiscount || undefined,
      totalUsageLimit: form.totalUsageLimit || undefined,
      limitPerUser: form.limitPerUser || undefined,
      minOrderValue: form.minOrderValue || undefined,
      validFrom: form.validFrom || undefined,
      validTo: form.validTo || undefined,
      zoneIds: form.selectedZoneIds,
      serviceIds: form.selectedServiceIds,
      status: action === 'activate' ? 'ACTIVE' : 'DRAFT',
      isActive: action === 'activate',
      showOnHome: form.showOnHome,
      bannerBadge: form.bannerBadge.trim(),
      bannerTitle: form.bannerTitle.trim(),
      bannerSubtitle: form.bannerSubtitle.trim(),
      bannerImageUrl: form.bannerImageUrl.trim(),
      bannerSortOrder: form.bannerSortOrder,
    }

    try {
      if (isEdit) {
        await updatePromotion(id, payload)
      } else {
        await createPromotion(payload)
      }
      navigate('/admin/promotions')
    } catch (err) {
      setFormError(err.message || `Failed to ${isEdit ? 'update' : 'create'} promotion`)
      setSaving('')
    }
  }

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setFormError('')
    try {
      setField('bannerImageUrl', await uploadFile(file))
    } catch (err) {
      setFormError(err.message || 'Failed to upload banner image')
    } finally {
      setUploading(false)
    }
  }

  const title = isEdit ? 'Edit Promotion' : 'Create Promotion'

  if (loading) {
    return (
      <div className="promotion-form-page">
        <PageHeader title={title} />
        <div className="sf-state"><Loader2 size={32} className="spin" /><span>Loading…</span></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="promotion-form-page">
        <PageHeader title={title} />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load promotion</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate('/admin/promotions')}>
            Back to promotions
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="promotion-form-page">
      <PageHeader
        title={title}
        subtitle={isEdit ? form.code : 'Define discount rules, targeting, and usage limits'}
      />

      <form className="sf-form" onSubmit={(e) => e.preventDefault()}>
        {formError && (
          <div className="sf-alert">
            <AlertTriangle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Promo code</h2>
            <p>What the customer types at checkout, and how much it takes off.</p>
          </header>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="code">Promo code <span className="sf-req">*</span></label>
              <input
                id="code"
                type="text"
                placeholder="e.g. SUMMER50"
                value={form.code}
                onChange={(e) => setField('code', e.target.value.toUpperCase())}
                disabled={Boolean(saving)}
              />
              <span className="sf-hint">Must be unique. Saved in uppercase.</span>
            </div>

            <div className="sf-field">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                placeholder="e.g. 20% off first booking"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                disabled={Boolean(saving)}
              />
              <span className="sf-hint">Falls back to the code if left empty.</span>
            </div>
          </div>

          <div className="sf-field">
            <label>Discount type</label>
            <div className="cp-segment">
              <button
                type="button"
                className={`cp-segment-btn ${isPercentage ? 'is-active' : ''}`}
                onClick={() => setField('discountType', 'PERCENTAGE')}
                disabled={Boolean(saving)}
              >
                <Percent size={15} /> Percentage
              </button>
              <button
                type="button"
                className={`cp-segment-btn ${!isPercentage ? 'is-active' : ''}`}
                onClick={() => setField('discountType', 'FIXED')}
                disabled={Boolean(saving)}
              >
                <CircleDollarSign size={15} /> Fixed amount
              </button>
            </div>
          </div>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="discountValue">Discount value <span className="sf-req">*</span></label>
              <div className="sf-input-affix">
                {!isPercentage && <span className="sf-affix riyal-symbol">&#x20C1;</span>}
                <input
                  id="discountValue"
                  type="number"
                  min="0"
                  max={isPercentage ? 100 : undefined}
                  step="0.01"
                  placeholder="0"
                  value={form.discountValue}
                  onChange={(e) => setField('discountValue', e.target.value)}
                  disabled={Boolean(saving)}
                />
                {isPercentage && <span className="sf-affix">%</span>}
              </div>
            </div>

            <div className="sf-field">
              <label htmlFor="maxDiscount">Max discount cap</label>
              <div className="sf-input-affix">
                <span className="sf-affix riyal-symbol">&#x20C1;</span>
                <input
                  id="maxDiscount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No cap"
                  value={form.maxDiscount}
                  onChange={(e) => setField('maxDiscount', e.target.value)}
                  disabled={Boolean(saving) || !isPercentage}
                />
              </div>
              <span className="sf-hint">
                {isPercentage
                  ? 'Ceiling on how much a percentage discount can take off.'
                  : 'Not used with a fixed amount.'}
              </span>
            </div>
          </div>
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Targeting</h2>
            <p>Leave both empty to make the promotion available everywhere, for every service.</p>
          </header>

          <div className="sf-field">
            <label>
              Zones
              {form.selectedZoneIds.length > 0 && (
                <span className="cp-selected">{form.selectedZoneIds.length} selected</span>
              )}
            </label>
            {zones.length === 0 ? (
              <p className="cp-empty">No zones found.</p>
            ) : (
              <div className="cp-pills">
                {zones.map(zone => {
                  const on = form.selectedZoneIds.includes(zone.id)
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      className={`cp-pill ${on ? 'is-on' : ''}`}
                      onClick={() => toggleIn('selectedZoneIds', zone.id)}
                      disabled={Boolean(saving)}
                      aria-pressed={on}
                    >
                      {on && <Check size={13} />}
                      {zone.zone_name}
                      {zone.city && <em>{zone.city}</em>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="sf-field">
            <label>
              Services
              {form.selectedServiceIds.length > 0 && (
                <span className="cp-selected">{form.selectedServiceIds.length} selected</span>
              )}
            </label>
            {selectableServices.length === 0 ? (
              <p className="cp-empty">No active services found.</p>
            ) : (
              <div className="cp-pills">
                {selectableServices.map(svc => {
                  const on = form.selectedServiceIds.includes(svc.id)
                  const retired = svc.is_active === false
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      className={`cp-pill ${on ? 'is-on' : ''} ${retired ? 'is-retired' : ''}`}
                      onClick={() => toggleIn('selectedServiceIds', svc.id)}
                      disabled={Boolean(saving)}
                      aria-pressed={on}
                      title={retired ? 'This service is inactive — deselect to remove it' : undefined}
                    >
                      {on && <Check size={13} />}
                      {svc.name_en}
                      {retired && <em>inactive</em>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Usage &amp; validity</h2>
            <p>Limits are optional — leave blank for unlimited.</p>
          </header>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="totalUsageLimit">Total usage limit</label>
              <input
                id="totalUsageLimit"
                type="number"
                min="1"
                step="1"
                placeholder="Unlimited"
                value={form.totalUsageLimit}
                onChange={(e) => setField('totalUsageLimit', e.target.value)}
                disabled={Boolean(saving)}
              />
            </div>

            <div className="sf-field">
              <label htmlFor="limitPerUser">Limit per customer</label>
              <input
                id="limitPerUser"
                type="number"
                min="1"
                step="1"
                placeholder="Unlimited"
                value={form.limitPerUser}
                onChange={(e) => setField('limitPerUser', e.target.value)}
                disabled={Boolean(saving)}
              />
            </div>
          </div>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="minOrderValue">Minimum order value</label>
              <div className="sf-input-affix">
                <span className="sf-affix riyal-symbol">&#x20C1;</span>
                <input
                  id="minOrderValue"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No minimum"
                  value={form.minOrderValue}
                  onChange={(e) => setField('minOrderValue', e.target.value)}
                  disabled={Boolean(saving)}
                />
              </div>
            </div>
          </div>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="validFrom">Valid from</label>
              <input
                id="validFrom"
                type="date"
                value={form.validFrom}
                onChange={(e) => setField('validFrom', e.target.value)}
                disabled={Boolean(saving)}
              />
            </div>

            <div className="sf-field">
              <label htmlFor="validTo">Valid to</label>
              <input
                id="validTo"
                type="date"
                value={form.validTo}
                onChange={(e) => setField('validTo', e.target.value)}
                disabled={Boolean(saving)}
              />
            </div>
          </div>
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Home banner</h2>
            <p>How this promotion appears on the customer app home screen.</p>
          </header>

          <label className="sf-toggle">
            <input
              type="checkbox"
              checked={form.showOnHome}
              onChange={(e) => setField('showOnHome', e.target.checked)}
              disabled={Boolean(saving)}
            />
            <span className="sf-toggle-track"><span className="sf-toggle-thumb" /></span>
            <span className="sf-toggle-copy">
              <strong>Show on home</strong>
              <em>Turn off to keep the coupon usable without featuring it on the carousel.</em>
            </span>
          </label>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="bannerBadge">Badge text</label>
              <input
                id="bannerBadge"
                type="text"
                placeholder="e.g. 20% off"
                value={form.bannerBadge}
                onChange={(e) => setField('bannerBadge', e.target.value)}
                disabled={Boolean(saving)}
              />
            </div>

            <div className="sf-field">
              <label htmlFor="bannerSortOrder">Sort order</label>
              <input
                id="bannerSortOrder"
                type="number"
                min="0"
                step="1"
                value={form.bannerSortOrder}
                onChange={(e) => setField('bannerSortOrder', e.target.value)}
                disabled={Boolean(saving)}
              />
              <span className="sf-hint">Lower numbers appear first.</span>
            </div>
          </div>

          <div className="sf-field">
            <label htmlFor="bannerTitle">Banner title</label>
            <input
              id="bannerTitle"
              type="text"
              placeholder="e.g. 20% Off First Booking"
              value={form.bannerTitle}
              onChange={(e) => setField('bannerTitle', e.target.value)}
              disabled={Boolean(saving)}
            />
          </div>

          <div className="sf-field">
            <label htmlFor="bannerSubtitle">Banner subtitle</label>
            <input
              id="bannerSubtitle"
              type="text"
              placeholder="e.g. New customers get 20% off their first service"
              value={form.bannerSubtitle}
              onChange={(e) => setField('bannerSubtitle', e.target.value)}
              disabled={Boolean(saving)}
            />
          </div>

          <div className="sf-field">
            <label htmlFor="bannerImageUrl">Banner image</label>
            <input
              id="bannerImageUrl"
              type="url"
              placeholder="https://…"
              value={form.bannerImageUrl}
              onChange={(e) => setField('bannerImageUrl', e.target.value)}
              disabled={Boolean(saving)}
            />
            <div className="cp-upload-row">
              <label className={`sf-btn sf-btn--secondary cp-upload ${uploading ? 'is-busy' : ''}`}>
                {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
                {uploading ? 'Uploading…' : 'Upload image'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={uploading || Boolean(saving)}
                  onChange={handleBannerUpload}
                />
              </label>

              {form.bannerImageUrl && (
                <div className="cp-preview">
                  <img src={form.bannerImageUrl} alt="Banner preview" />
                  <button
                    type="button"
                    className="cp-preview-clear"
                    onClick={() => setField('bannerImageUrl', '')}
                    title="Remove image"
                    aria-label="Remove banner image"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>
            <span className="sf-hint">Optional — the app falls back to a default image.</span>
          </div>
        </section>

        <div className="sf-actions">
          <button
            type="button"
            className="sf-btn sf-btn--secondary"
            onClick={() => navigate('/admin/promotions')}
            disabled={Boolean(saving)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="sf-btn sf-btn--secondary"
            onClick={() => handleSubmit('draft')}
            disabled={Boolean(saving)}
          >
            {saving === 'draft' ? <><Loader2 size={16} className="spin" /> Saving…</> : 'Save as draft'}
          </button>
          <button
            type="button"
            className="sf-btn sf-btn--primary"
            onClick={() => handleSubmit('activate')}
            disabled={Boolean(saving)}
          >
            {saving === 'activate'
              ? <><Loader2 size={16} className="spin" /> Saving…</>
              : <><Check size={16} /> {isEdit ? 'Save & activate' : 'Create & activate'}</>}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreatePromotion
