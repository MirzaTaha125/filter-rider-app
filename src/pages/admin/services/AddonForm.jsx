import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
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
import { PageShimmer } from '../../../components/Shimmer/Shimmer'


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
        // A new add-on is only a title and a price. It stays off until
        // someone ticks it on a service.
        setForm(f => ({
          ...f,
          serviceId: serviceList[0]?.id || '',
          is_active: false,
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
  }, [addonId, isEdit, location.state])

  useEffect(() => { loadData() }, [loadData])

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const validate = () => {
    if (!form.serviceId) return 'Create a service before adding add-ons.'
    if (!form.name_en.trim()) return 'Title is required.'
    const price = Number(form.price)
    if (form.price === '' || Number.isNaN(price) || price < 0) {
      return 'Price must be a valid number of 0 or more.'
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
      isActive: isEdit ? form.is_active : false,
      serviceId: form.serviceId,
    }

    try {
      if (isEdit) {
        await updateServiceAddon(addonId, payload)
      } else {
        await createServiceAddon(payload)
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
        <PageShimmer />
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
        subtitle={isEdit ? form.name_en : 'Title and one price. Tick it on a service when that service should offer it.'}
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
            <h2>Add-on</h2>
            <p>A title and one price. Not priced by vehicle size.</p>
          </header>

          {services.length === 0 && (
            <span className="sf-hint sf-hint--warn">
              No services found. Create a service before adding add-ons.
            </span>
          )}

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="name_en">Title <span className="sf-req">*</span></label>
              <input
                id="name_en"
                type="text"
                placeholder="e.g. Nano Waxing"
                value={form.name_en}
                onChange={(e) => setField('name_en', e.target.value)}
                disabled={saving}
              />
            </div>

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
          </div>

          <div className="sf-field">
            <label htmlFor="name_ar">Title (Arabic)</label>
            <input
              id="name_ar"
              type="text"
              dir="rtl"
              placeholder="تلميع"
              value={form.name_ar}
              onChange={(e) => setField('name_ar', e.target.value)}
              disabled={saving}
            />
            <span className="sf-hint">Falls back to the English title if left empty.</span>
          </div>
        </section>

        {isEdit && <section className="sf-card">
          <header className="sf-card-head">
            <h2>Status</h2>
            <p>Customers only see this after you tick it on a service.</p>
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
        </section>}

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
