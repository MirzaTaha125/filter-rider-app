import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getServices,
  getServiceAddons,
  createServiceAddon,
  updateServiceAddon,
} from '../../../api'
import '../adminForm.css'
import './AddonForm.css'

const EMPTY_FORM = {
  serviceId: '',
  name_en: '',
  name_ar: '',
  price: '',
  additional_duration: '',
  is_active: true,
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function AddonForm() {
  const { addonId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(addonId)

  const [form, setForm] = useState(EMPTY_FORM)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const serviceList = toArray(await getServices(null, true))
      setServices(serviceList)

      if (!isEdit) {
        // Adding from a specific service's row pre-selects that service.
        const preselected = searchParams.get('serviceId')
        setForm(f => ({
          ...f,
          serviceId: preselected || serviceList[0]?.id || '',
        }))
        return
      }

      // Add-ons are only listed per service, so prefer the id handed over by
      // the list page and fall back to scanning when deep-linked or refreshed.
      const hintedServiceId = location.state?.serviceId
      const searchOrder = hintedServiceId
        ? [hintedServiceId, ...serviceList.map(s => s.id).filter(id => id !== hintedServiceId)]
        : serviceList.map(s => s.id)

      let found = null
      let owningServiceId = ''
      for (const serviceId of searchOrder) {
        const addons = toArray(await getServiceAddons(serviceId, true).catch(() => []))
        const match = addons.find(a => a.id === addonId)
        if (match) {
          found = match
          owningServiceId = serviceId
          break
        }
      }

      if (!found) {
        setLoadError('Add-on not found')
        return
      }

      setForm({
        serviceId: found.service_id || owningServiceId,
        name_en: found.name_en ?? '',
        name_ar: found.name_ar ?? '',
        price: String(found.price ?? ''),
        additional_duration: String(found.additional_duration ?? ''),
        is_active: found.is_active !== false,
      })
    } catch (err) {
      setLoadError(err.message || 'Failed to load add-on')
    } finally {
      setLoading(false)
    }
  }, [addonId, isEdit, location.state, searchParams])

  useEffect(() => { loadData() }, [loadData])

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const validate = () => {
    if (!form.serviceId) return 'Please choose the service this add-on belongs to.'
    if (!form.name_en.trim()) return 'Add-on name (English) is required.'
    const price = Number(form.price)
    if (form.price === '' || Number.isNaN(price) || price < 0) {
      return 'Price must be a valid number of 0 or more.'
    }
    const duration = form.additional_duration === '' ? 0 : Number(form.additional_duration)
    if (!Number.isInteger(duration) || duration < 0) {
      return 'Extra duration must be a whole number of 0 or more minutes.'
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
      name: form.name_en.trim(),
      nameAr: form.name_ar.trim() || form.name_en.trim(),
      price: Number(form.price).toFixed(2),
      duration: form.additional_duration === '' ? 0 : Number(form.additional_duration),
      isActive: form.is_active,
    }

    try {
      if (isEdit) {
        await updateServiceAddon(addonId, payload)
      } else {
        await createServiceAddon({ ...payload, serviceId: form.serviceId })
      }
      navigate('/admin/services/addons')
    } catch (err) {
      setFormError(err.message || 'Failed to save add-on')
      setSaving(false)
    }
  }

  const title = isEdit ? 'Edit Add-on' : 'Add New Add-on'

  if (loading) {
    return (
      <div className="addon-form-page">
        <PageHeader title={title} />
        <div className="sf-state">
          <Loader2 size={32} className="spin" />
          <span>Loading…</span>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="addon-form-page">
        <PageHeader title={title} />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load add-on</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate('/admin/services/addons')}>
            Back to add-ons
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="addon-form-page">
      <PageHeader
        title={title}
        subtitle={isEdit ? form.name_en : 'Create an optional extra customers can add to a service'}
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
            <h2>Basic information</h2>
            <p>Which service this add-on belongs to, and what customers will see.</p>
          </header>

          <div className="sf-field">
            <label htmlFor="serviceId">Service <span className="sf-req">*</span></label>
            <select
              id="serviceId"
              value={form.serviceId}
              onChange={(e) => setField('serviceId', e.target.value)}
              disabled={saving || isEdit || services.length === 0}
            >
              <option value="">Select a service…</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>{service.name_en}</option>
              ))}
            </select>
            {isEdit ? (
              <span className="sf-hint">
                An add-on cannot be moved to a different service. Delete it and create a new one instead.
              </span>
            ) : services.length === 0 ? (
              <span className="sf-hint sf-hint--warn">
                No services found. Create a service before adding add-ons.
              </span>
            ) : null}
          </div>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="name_en">Add-on name (English) <span className="sf-req">*</span></label>
              <input
                id="name_en"
                type="text"
                placeholder="e.g. Wax Polish"
                value={form.name_en}
                onChange={(e) => setField('name_en', e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="sf-field">
              <label htmlFor="name_ar">Add-on name (Arabic)</label>
              <input
                id="name_ar"
                type="text"
                dir="rtl"
                placeholder="تلميع الشمع"
                value={form.name_ar}
                onChange={(e) => setField('name_ar', e.target.value)}
                disabled={saving}
              />
              <span className="sf-hint">Falls back to the English name if left empty.</span>
            </div>
          </div>
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Pricing &amp; duration</h2>
            <p>Added on top of the service’s base price and time when the customer selects it.</p>
          </header>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="price">Price <span className="sf-req">*</span></label>
              <div className="sf-input-affix">
                <span className="sf-affix riyal-symbol">&#x20C1;</span>
                <input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => setField('price', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="sf-field">
              <label htmlFor="additional_duration">Extra duration</label>
              <div className="sf-input-affix">
                <input
                  id="additional_duration"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.additional_duration}
                  onChange={(e) => setField('additional_duration', e.target.value)}
                  disabled={saving}
                />
                <span className="sf-affix">min</span>
              </div>
              <span className="sf-hint">Leave at 0 if this add-on takes no extra time.</span>
            </div>
          </div>
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Status</h2>
            <p>Controls whether customers can select this add-on when booking.</p>
          </header>

          <label className="sf-toggle">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setField('is_active', e.target.checked)}
              disabled={saving}
            />
            <span className="sf-toggle-track"><span className="sf-toggle-thumb" /></span>
            <span className="sf-toggle-copy">
              <strong>Active</strong>
              <em>Inactive add-ons stay on past orders but cannot be selected on new ones.</em>
            </span>
          </label>
        </section>

        <div className="sf-actions">
          <button
            type="button"
            className="sf-btn sf-btn--secondary"
            onClick={() => navigate('/admin/services/addons')}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="sf-btn sf-btn--primary" disabled={saving}>
            {saving
              ? <><Loader2 size={16} className="spin" /> Saving…</>
              : isEdit ? 'Save changes' : 'Create add-on'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddonForm
