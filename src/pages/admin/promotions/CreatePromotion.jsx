import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  MapPin, X, Loader2, Ticket, Percent,
  Tag, Settings, Calendar, Check, AlertCircle,
  Layers, CircleDollarSign, Hash, Users, Banknote, Image as ImageIcon
} from 'lucide-react'
import { createPromotion, updatePromotion, getPromotion, getZones, getServices, uploadFile } from '../../../api'
import './CreatePromotion.css'

function toDateInput(val) {
  if (!val) return ''
  const str = typeof val === 'string' ? val : val.iso ?? val.date ?? String(val)
  return str.slice(0, 10) // "YYYY-MM-DD"
}

function getTitle(title) {
  if (!title) return ''
  if (typeof title === 'string') return title
  return title.en ?? title.ar ?? Object.values(title)[0] ?? ''
}

function onlyActiveServices(list) {
  return (Array.isArray(list) ? list : []).filter((svc) => {
    if (svc?.is_active === false || svc?.isActive === false) return false
    return true
  })
}

function CreatePromotion() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [formData, setFormData] = useState({
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
  })

  const [zones, setZones] = useState([])
  const [services, setServices] = useState([])
  const [saving, setSaving] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [loadingPromo, setLoadingPromo] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDropdowns = Promise.all([
      getZones({}).catch(() => []),
      getServices(null, true).catch(() => []),
    ])

    if (isEdit) {
      setLoadingPromo(true)
      Promise.all([
        fetchDropdowns,
        getPromotion(id),
      ]).then(([[zonesData, servicesData], promo]) => {
        setZones(Array.isArray(zonesData) ? zonesData : [])
        setServices(onlyActiveServices(servicesData))
        if (promo) {
          setFormData({
            code: promo.code ?? '',
            title: getTitle(promo.title),
            discountType: promo.discount_type ?? 'PERCENTAGE',
            discountValue: promo.discount_value ? String(parseFloat(promo.discount_value)) : '',
            maxDiscount: promo.max_discount ? String(promo.max_discount) : '',
            selectedZoneIds: (promo.zones ?? []).map(z => z.zone_id),
            selectedServiceIds: (promo.services ?? []).map(s => s.service_id),
            totalUsageLimit: promo.total_usage_limit ? String(promo.total_usage_limit) : '',
            limitPerUser: promo.limit_per_user ? String(promo.limit_per_user) : '',
            minOrderValue: promo.min_order_value ? String(promo.min_order_value) : '',
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
      }).catch(err => setError(err.message || 'Failed to load promotion'))
        .finally(() => setLoadingPromo(false))
    } else {
      fetchDropdowns.then(([zonesData, servicesData]) => {
        setZones(Array.isArray(zonesData) ? zonesData : [])
        setServices(onlyActiveServices(servicesData))
      })
    }
  }, [id])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const toggleZone = (zoneId) => {
    setFormData(prev => ({
      ...prev,
      selectedZoneIds: prev.selectedZoneIds.includes(zoneId)
        ? prev.selectedZoneIds.filter(z => z !== zoneId)
        : [...prev.selectedZoneIds, zoneId],
    }))
  }

  const toggleService = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      selectedServiceIds: prev.selectedServiceIds.includes(serviceId)
        ? prev.selectedServiceIds.filter(s => s !== serviceId)
        : [...prev.selectedServiceIds, serviceId],
    }))
  }

  const handleSubmit = async (action) => {
    if (!formData.code.trim()) { setError('Promo code is required.'); return }
    if (!formData.discountValue) { setError('Discount value is required.'); return }

    setSaving(true)
    setError('')
    const payload = {
      code: formData.code.trim().toUpperCase(),
      title: formData.title.trim() || formData.code.trim().toUpperCase(),
      discountType: formData.discountType,
      discountValue: formData.discountValue,
      maxDiscount: formData.maxDiscount || undefined,
      totalUsageLimit: formData.totalUsageLimit || undefined,
      limitPerUser: formData.limitPerUser || undefined,
      minOrderValue: formData.minOrderValue || undefined,
      validFrom: formData.validFrom || undefined,
      validTo: formData.validTo || undefined,
      zoneIds: formData.selectedZoneIds.length ? formData.selectedZoneIds : [],
      serviceIds: formData.selectedServiceIds.length ? formData.selectedServiceIds : [],
      status: action === 'activate' ? 'ACTIVE' : 'DRAFT',
      isActive: action === 'activate',
      showOnHome: formData.showOnHome,
      bannerBadge: formData.bannerBadge.trim(),
      bannerTitle: formData.bannerTitle.trim(),
      bannerSubtitle: formData.bannerSubtitle.trim(),
      bannerImageUrl: formData.bannerImageUrl.trim(),
      bannerSortOrder: formData.bannerSortOrder,
    }
    try {
      if (isEdit) {
        await updatePromotion(id, payload)
      } else {
        await createPromotion(payload)
      }
      navigate('/admin/promotions')
    } catch (err) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'create'} promotion`)
    } finally {
      setSaving(false)
    }
  }

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingBanner(true)
    setError('')
    try {
      const url = await uploadFile(file)
      handleInputChange('bannerImageUrl', url)
    } catch (err) {
      setError(err.message || 'Failed to upload banner image')
    } finally {
      setUploadingBanner(false)
    }
  }

  if (loadingPromo) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '48px 0', color: '#6b7280' }}>
        <Loader2 size={20} className="spin-icon" />
        <span>Loading promotion...</span>
      </div>
    )
  }

  return (
    <div className="create-promotion-container">
      <div className="promotion-header">
        <h1 className="promotion-title">
          <Ticket size={28} color="#FCC246" />
          {isEdit ? 'Edit Promotion' : 'Create New Promotion'}
        </h1>
        <p className="promotion-subtitle">Define discount rules, targeting restrictions, and usage limits.</p>
      </div>

      <form className="promotion-form" onSubmit={(e) => e.preventDefault()}>
        {error && (
          <div className="api-error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Promo Code Details Card */}
        <div className="form-card">
          <div className="card-header">
            <div className="card-icon"><Tag size={20} /></div>
            <h2 className="card-title">Promo Code Details</h2>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="code">Promo Code *</label>
                <div className="input-wrapper">
                  <div className="input-icon left"><Hash size={18} /></div>
                  <input
                    type="text"
                    id="code"
                    className="form-input has-left-icon"
                    placeholder="e.g. SUMMER50"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  />
                </div>
                <span className="helper-text">Unique code customers will enter to redeem.</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="title">Promotion Title</label>
                <input
                  type="text"
                  id="title"
                  className="form-input"
                  placeholder="e.g. 20% off • First Ride"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ maxWidth: '400px' }}>
              <label className="form-label">Discount Type</label>
              <div className="segment-control">
                <button
                  type="button"
                  className={`segment-btn ${formData.discountType === 'PERCENTAGE' ? 'active' : ''}`}
                  onClick={() => handleInputChange('discountType', 'PERCENTAGE')}
                >
                  <Percent size={16} /> Percentage
                </button>
                <button
                  type="button"
                  className={`segment-btn ${formData.discountType === 'FLAT' ? 'active' : ''}`}
                  onClick={() => handleInputChange('discountType', 'FLAT')}
                >
                  <CircleDollarSign size={16} /> Fixed Amount
                </button>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="discountValue">
                  Value {formData.discountType === 'PERCENTAGE' ? '(%)' : '(SAR)'}
                </label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    id="discountValue"
                    className="form-input has-right-icon"
                    placeholder="0"
                    value={formData.discountValue}
                    onChange={(e) => handleInputChange('discountValue', e.target.value)}
                  />
                  <div className="input-icon right" style={{ fontSize: '0.9rem' }}>
                    {formData.discountType === 'PERCENTAGE' ? '%' : 'SAR'}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="maxDiscount">Max Discount Cap</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    id="maxDiscount"
                    className="form-input has-right-icon"
                    placeholder="0"
                    value={formData.maxDiscount}
                    onChange={(e) => handleInputChange('maxDiscount', e.target.value)}
                  />
                  <div className="input-icon right" style={{ fontSize: '0.9rem' }}>SAR</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Targeting Restrictions Card */}
        <div className="form-card">
          <div className="card-header">
            <div className="card-icon"><MapPin size={20} /></div>
            <h2 className="card-title">Targeting Restrictions</h2>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label"><MapPin size={16} className="text-gray-500" /> Available in Zones</label>
              {zones.length === 0 ? (
                <div className="empty-state">No zones found</div>
              ) : (
                <div className="selection-grid">
                  {zones.map(zone => (
                    <div
                      key={zone.id}
                      className={`selection-pill ${formData.selectedZoneIds.includes(zone.id) ? 'selected' : ''}`}
                      onClick={() => toggleZone(zone.id)}
                    >
                      {formData.selectedZoneIds.includes(zone.id) && <Check className="pill-icon" />}
                      {zone.name ?? zone.city ?? zone.id}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <label className="form-label"><Layers size={16} className="text-gray-500" /> Applicable Services</label>
              {services.length === 0 ? (
                <div className="empty-state">No services found</div>
              ) : (
                <div className="selection-grid">
                  {services.map(svc => (
                    <div
                      key={svc.id}
                      className={`selection-pill ${formData.selectedServiceIds.includes(svc.id) ? 'selected' : ''}`}
                      onClick={() => toggleService(svc.id)}
                    >
                      {formData.selectedServiceIds.includes(svc.id) && <Check className="pill-icon" />}
                      {svc.name_en ?? svc.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Usage & Validity Card */}
        <div className="form-card">
          <div className="card-header">
            <div className="card-icon"><Settings size={20} /></div>
            <h2 className="card-title">Usage & Validity</h2>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="totalUsageLimit">Total Usage Limit</label>
                <div className="input-wrapper">
                  <div className="input-icon left"><Users size={18} /></div>
                  <input
                    type="number"
                    id="totalUsageLimit"
                    className="form-input has-left-icon"
                    placeholder="e.g. 1000"
                    value={formData.totalUsageLimit}
                    onChange={(e) => handleInputChange('totalUsageLimit', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="limitPerUser">Limit per User</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    id="limitPerUser"
                    className="form-input"
                    placeholder="e.g. 1"
                    value={formData.limitPerUser}
                    onChange={(e) => handleInputChange('limitPerUser', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="minOrderValue">Min Order Value</label>
                <div className="input-wrapper">
                  <div className="input-icon left"><Banknote size={18} /></div>
                  <input
                    type="number"
                    id="minOrderValue"
                    className="form-input has-left-icon has-right-icon"
                    placeholder="0"
                    value={formData.minOrderValue}
                    onChange={(e) => handleInputChange('minOrderValue', e.target.value)}
                  />
                  <div className="input-icon right" style={{ fontSize: '0.9rem' }}>SAR</div>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="validFrom"><Calendar size={16} /> Valid From</label>
                <input
                  type="date"
                  id="validFrom"
                  className="form-input"
                  value={formData.validFrom}
                  onChange={(e) => handleInputChange('validFrom', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="validTo"><Calendar size={16} /> Valid To</label>
                <input
                  type="date"
                  id="validTo"
                  className="form-input"
                  value={formData.validTo}
                  onChange={(e) => handleInputChange('validTo', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Home Banner Card */}
        <div className="form-card">
          <div className="card-header">
            <div className="card-icon"><ImageIcon size={20} /></div>
            <h2 className="card-title">Customer App Home Banner</h2>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="checkbox-label" htmlFor="showOnHome">
                  <input
                    type="checkbox"
                    id="showOnHome"
                    checked={formData.showOnHome}
                    onChange={(e) => handleInputChange('showOnHome', e.target.checked)}
                  />
                  <span>Show this promotion as a home banner</span>
                </label>
                <span className="helper-text">Active promotions appear on the customer home carousel. Uncheck to hide from home while keeping the coupon usable.</span>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="bannerSortOrder">Sort order</label>
                <input
                  type="number"
                  id="bannerSortOrder"
                  className="form-input"
                  min="0"
                  value={formData.bannerSortOrder}
                  onChange={(e) => handleInputChange('bannerSortOrder', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="bannerBadge">Badge text</label>
                <input
                  type="text"
                  id="bannerBadge"
                  className="form-input"
                  placeholder="e.g. 20% off"
                  value={formData.bannerBadge}
                  onChange={(e) => handleInputChange('bannerBadge', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="bannerTitle">Banner title</label>
                <input
                  type="text"
                  id="bannerTitle"
                  className="form-input"
                  placeholder="e.g. 20% Off First Booking"
                  value={formData.bannerTitle}
                  onChange={(e) => handleInputChange('bannerTitle', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="bannerSubtitle">Banner subtitle</label>
              <input
                type="text"
                id="bannerSubtitle"
                className="form-input"
                placeholder="e.g. New users get 20% off their first service"
                value={formData.bannerSubtitle}
                onChange={(e) => handleInputChange('bannerSubtitle', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="bannerImageUrl">Banner image URL</label>
              <div className="input-wrapper">
                <input
                  type="url"
                  id="bannerImageUrl"
                  className="form-input"
                  placeholder="https://..."
                  value={formData.bannerImageUrl}
                  onChange={(e) => handleInputChange('bannerImageUrl', e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <label className="btn btn-secondary" style={{ margin: 0, cursor: uploadingBanner ? 'wait' : 'pointer' }}>
                  {uploadingBanner ? <Loader2 size={16} className="spin-icon" /> : null}
                  {uploadingBanner ? 'Uploading...' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={uploadingBanner}
                    onChange={handleBannerUpload}
                  />
                </label>
                {formData.bannerImageUrl ? (
                  <img
                    src={formData.bannerImageUrl}
                    alt="Banner preview"
                    style={{ height: 56, borderRadius: 8, objectFit: 'cover', background: '#f3f4f6' }}
                  />
                ) : null}
              </div>
              <span className="helper-text">Optional. If empty, the customer app uses the default banner image.</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/admin/promotions')}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleSubmit('draft')}
            disabled={saving}
          >
            {saving ? <Loader2 size={16} className="spin-icon" /> : null}
            {isEdit ? 'Save as Draft' : 'Save Draft'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSubmit('activate')}
            disabled={saving}
          >
            {saving ? <Loader2 size={16} className="spin-icon" /> : <Check size={18} />}
            {isEdit ? 'Update & Activate' : 'Activate Promotion'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreatePromotion
