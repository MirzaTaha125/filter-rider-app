import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getServices,
  getSizeCategories,
  getPricingMatrix,
  createPricingMatrix,
  updatePricingMatrix,
} from '../../../api'
import '../adminForm.css'
import './PricingForm.css'

const EMPTY_FORM = {
  serviceId: '',
  sizeCategoryId: '',
  basePrice: '',
  duration: '',
  status: true,
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function PricingForm() {
  const { serviceId, sizeCategoryId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(serviceId && sizeCategoryId)

  const [form, setForm] = useState(EMPTY_FORM)
  const [services, setServices] = useState([])
  const [sizeCategories, setSizeCategories] = useState([])
  const [existingKeys, setExistingKeys] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [svcs, sizes] = await Promise.all([
        getServices(null, true),
        getSizeCategories(),
      ])
      const serviceList = toArray(svcs)
      const sizeList = toArray(sizes)
      setServices(serviceList)
      setSizeCategories(sizeList)

      if (isEdit) {
        const rows = toArray(await getPricingMatrix(serviceId))
        const found = rows.find(r => r.size_category_id === sizeCategoryId)
        if (!found) {
          setLoadError('Pricing entry not found')
          return
        }
        setForm({
          serviceId,
          sizeCategoryId,
          basePrice: String(found.base_price ?? ''),
          duration: String(found.duration_min ?? ''),
          status: found.status !== false,
        })
        return
      }

      // Creating: remember which size categories the chosen service already has,
      // so we do not offer a combination the composite primary key will reject.
      const preselectedService = searchParams.get('serviceId') || serviceList[0]?.id || ''
      const taken = preselectedService
        ? new Set(toArray(await getPricingMatrix(preselectedService).catch(() => []))
            .map(r => r.size_category_id))
        : new Set()
      setExistingKeys(taken)
      setForm({
        ...EMPTY_FORM,
        serviceId: preselectedService,
        sizeCategoryId: sizeList.find(s => !taken.has(s.id))?.id ?? '',
      })
    } catch (err) {
      setLoadError(err.message || 'Failed to load pricing entry')
    } finally {
      setLoading(false)
    }
  }, [serviceId, sizeCategoryId, isEdit, searchParams])

  useEffect(() => { loadData() }, [loadData])

  // Swapping service while creating changes which size categories are still free.
  const handleServiceChange = async (nextServiceId) => {
    setForm(prev => ({ ...prev, serviceId: nextServiceId }))
    setFormError('')
    if (!nextServiceId) {
      setExistingKeys(new Set())
      return
    }
    const taken = new Set(
      toArray(await getPricingMatrix(nextServiceId).catch(() => []))
        .map(r => r.size_category_id),
    )
    setExistingKeys(taken)
    setForm(prev => ({
      ...prev,
      sizeCategoryId: taken.has(prev.sizeCategoryId)
        ? (sizeCategories.find(s => !taken.has(s.id))?.id ?? '')
        : prev.sizeCategoryId,
    }))
  }

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const validate = () => {
    if (!form.serviceId) return 'Please choose a service.'
    if (!form.sizeCategoryId) return 'Please choose a size category.'
    const price = Number(form.basePrice)
    if (form.basePrice === '' || Number.isNaN(price) || price < 0) {
      return 'Base price must be a valid number of 0 or more.'
    }
    const duration = Number(form.duration)
    if (!Number.isInteger(duration) || duration < 1) {
      return 'Duration must be a whole number of at least 1 minute.'
    }
    if (!isEdit && existingKeys.has(form.sizeCategoryId)) {
      return 'This service already has pricing for that size category. Edit the existing entry instead.'
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
    try {
      if (isEdit) {
        await updatePricingMatrix(serviceId, sizeCategoryId, {
          basePrice: Number(form.basePrice).toFixed(2),
          duration: Number(form.duration),
          status: form.status,
        })
      } else {
        await createPricingMatrix({
          serviceId: form.serviceId,
          sizeCategoryId: form.sizeCategoryId,
          basePrice: Number(form.basePrice).toFixed(2),
          duration: Number(form.duration),
          status: form.status,
        })
      }
      navigate('/admin/services/pricing-matrix')
    } catch (err) {
      setFormError(err.message || 'Failed to save pricing entry')
      setSaving(false)
    }
  }

  const title = isEdit ? 'Edit Pricing' : 'Add New Pricing'
  const serviceName = services.find(s => s.id === form.serviceId)?.name_en
  const sizeName = sizeCategories.find(s => s.id === form.sizeCategoryId)?.name

  if (loading) {
    return (
      <div className="pricing-form-page">
        <PageHeader title={title} />
        <div className="sf-state"><Loader2 size={32} className="spin" /><span>Loading…</span></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="pricing-form-page">
        <PageHeader title={title} />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load pricing entry</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate('/admin/services/pricing-matrix')}>
            Back to pricing matrix
          </button>
        </div>
      </div>
    )
  }

  const noOptions = services.length === 0 || sizeCategories.length === 0

  return (
    <div className="pricing-form-page">
      <PageHeader
        title={title}
        subtitle={isEdit && serviceName ? `${serviceName} · ${sizeName ?? ''}`.trim() : 'Set the price for one service and size combination'}
      />

      <form className="sf-form" onSubmit={handleSubmit}>
        {formError && (
          <div className="sf-alert">
            <AlertTriangle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Combination</h2>
            <p>Each service can have one price per size category.</p>
          </header>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="serviceId">Service <span className="sf-req">*</span></label>
              <select
                id="serviceId"
                value={form.serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                disabled={saving || isEdit || noOptions}
              >
                <option value="">Select a service…</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>{service.name_en}</option>
                ))}
              </select>
            </div>

            <div className="sf-field">
              <label htmlFor="sizeCategoryId">Size category <span className="sf-req">*</span></label>
              <select
                id="sizeCategoryId"
                value={form.sizeCategoryId}
                onChange={(e) => setField('sizeCategoryId', e.target.value)}
                disabled={saving || isEdit || noOptions}
              >
                <option value="">Select a size category…</option>
                {sizeCategories.map(size => {
                  const taken = !isEdit && existingKeys.has(size.id)
                  return (
                    <option key={size.id} value={size.id} disabled={taken}>
                      {size.name}{taken ? ' — already priced' : ''}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          {isEdit ? (
            <span className="sf-hint">
              Service and size category form this entry’s key and cannot be changed. Delete it and create a new one instead.
            </span>
          ) : services.length === 0 ? (
            <span className="sf-hint sf-hint--warn">No services found. Create a service first.</span>
          ) : sizeCategories.length === 0 ? (
            <span className="sf-hint sf-hint--warn">
              No size categories found. Add them under Assets → Size Categories first.
            </span>
          ) : null}
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Pricing &amp; duration</h2>
            <p>Overrides the service’s base price and duration for this size.</p>
          </header>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="basePrice">Base price <span className="sf-req">*</span></label>
              <div className="sf-input-affix">
                <span className="sf-affix riyal-symbol">&#x20C1;</span>
                <input
                  id="basePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.basePrice}
                  onChange={(e) => setField('basePrice', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="sf-field">
              <label htmlFor="duration">Duration <span className="sf-req">*</span></label>
              <div className="sf-input-affix">
                <input
                  id="duration"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="60"
                  value={form.duration}
                  onChange={(e) => setField('duration', e.target.value)}
                  disabled={saving}
                />
                <span className="sf-affix">min</span>
              </div>
            </div>
          </div>
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Status</h2>
            <p>Controls whether this price is used when quoting a booking.</p>
          </header>

          <label className="sf-toggle">
            <input
              type="checkbox"
              checked={form.status}
              onChange={(e) => setField('status', e.target.checked)}
              disabled={saving}
            />
            <span className="sf-toggle-track"><span className="sf-toggle-thumb" /></span>
            <span className="sf-toggle-copy">
              <strong>Active</strong>
              <em>Inactive entries are ignored, and the service’s own base price applies.</em>
            </span>
          </label>
        </section>

        <div className="sf-actions">
          <button
            type="button"
            className="sf-btn sf-btn--secondary"
            onClick={() => navigate('/admin/services/pricing-matrix')}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="sf-btn sf-btn--primary" disabled={saving || noOptions}>
            {saving
              ? <><Loader2 size={16} className="spin" /> Saving…</>
              : isEdit ? 'Save changes' : 'Create pricing'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PricingForm
