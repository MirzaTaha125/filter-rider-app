import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, Check } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getServiceCategories,
  getServices,
  createService,
  updateService,
} from '../../../api'
import { SERVICE_ICONS, DEFAULT_SERVICE_ICON } from './serviceIcons'
import '../adminForm.css'
import './ServiceForm.css'

const COLOR_SWATCHES = [
  '#f0b020', '#3b82f6', '#10b981', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
]

const EMPTY_FORM = {
  name_en: '',
  name_ar: '',
  category_id: '',
  icon: DEFAULT_SERVICE_ICON,
  icon_color: '#f0b020',
  base_price: '',
  duration_min: '',
  is_active: true,
}

function ServiceForm() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(serviceId)

  const [form, setForm] = useState(EMPTY_FORM)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [cats, services] = await Promise.all([
        getServiceCategories(true),
        isEdit ? getServices(null, true) : Promise.resolve([]),
      ])

      const catList = Array.isArray(cats) ? cats : []
      setCategories(catList)

      if (isEdit) {
        const found = (Array.isArray(services) ? services : []).find(s => s.id === serviceId)
        if (!found) {
          setLoadError('Service not found')
          return
        }
        setForm({
          name_en: found.name_en ?? '',
          name_ar: found.name_ar ?? '',
          category_id: found.category_id ?? '',
          icon: found.icon || DEFAULT_SERVICE_ICON,
          icon_color: found.icon_color || '#f0b020',
          base_price: String(found.base_price ?? ''),
          duration_min: String(found.duration_min ?? ''),
          is_active: found.is_active !== false,
        })
      } else {
        setForm(f => ({ ...f, category_id: catList[0]?.id ?? '' }))
      }
    } catch (err) {
      setLoadError(err.message || 'Failed to load service')
    } finally {
      setLoading(false)
    }
  }, [serviceId, isEdit])

  useEffect(() => { loadData() }, [loadData])

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const validate = () => {
    if (!form.name_en.trim()) return 'Service name (English) is required.'
    if (!form.category_id) return 'Please select a category.'
    const price = Number(form.base_price)
    if (form.base_price === '' || Number.isNaN(price) || price < 0) {
      return 'Base price must be a valid number of 0 or more.'
    }
    const duration = Number(form.duration_min)
    if (!Number.isInteger(duration) || duration < 1) {
      return 'Duration must be a whole number of at least 1 minute.'
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
      categoryId: form.category_id,
      name: form.name_en.trim(),
      nameAr: form.name_ar.trim() || form.name_en.trim(),
      icon: form.icon,
      color: form.icon_color,
      basePrice: Number(form.base_price).toFixed(2),
      duration: Number(form.duration_min),
      isActive: form.is_active,
    }

    try {
      if (isEdit) {
        await updateService(serviceId, payload)
      } else {
        await createService(payload)
      }
      navigate('/admin/services')
    } catch (err) {
      setFormError(err.message || 'Failed to save service')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="service-form-page">
        <PageHeader title={isEdit ? 'Edit Service' : 'Add New Service'} />
        <div className="sf-state">
          <Loader2 size={32} className="spin" />
          <span>Loading…</span>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="service-form-page">
        <PageHeader title={isEdit ? 'Edit Service' : 'Add New Service'} />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load service</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate('/admin/services')}>
            Back to services
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="service-form-page">
      <PageHeader
        title={isEdit ? 'Edit Service' : 'Add New Service'}
        subtitle={isEdit ? form.name_en : 'Create a new service in the catalog'}
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
            <p>Name shown to customers and the category this service belongs to.</p>
          </header>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="name_en">Service name (English) <span className="sf-req">*</span></label>
              <input
                id="name_en"
                type="text"
                placeholder="e.g. Car Wash"
                value={form.name_en}
                onChange={(e) => setField('name_en', e.target.value)}
                disabled={saving}
                maxLength={160}
              />
            </div>

            <div className="sf-field">
              <label htmlFor="name_ar">Service name (Arabic)</label>
              <input
                id="name_ar"
                type="text"
                dir="rtl"
                placeholder="غسيل السيارة"
                value={form.name_ar}
                onChange={(e) => setField('name_ar', e.target.value)}
                disabled={saving}
                maxLength={160}
              />
              <span className="sf-hint">Falls back to the English name if left empty.</span>
            </div>
          </div>

          <div className="sf-field">
            <label htmlFor="category_id">Category <span className="sf-req">*</span></label>
            <select
              id="category_id"
              value={form.category_id}
              onChange={(e) => setField('category_id', e.target.value)}
              disabled={saving || categories.length === 0}
            >
              <option value="">Select a category…</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.title_en}{cat.title_ar ? ` — ${cat.title_ar}` : ''}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <span className="sf-hint sf-hint--warn">
                No categories found. Create one under Assets → Categories first.
              </span>
            )}
          </div>
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Pricing &amp; duration</h2>
            <p>Starting price before add-ons, service types, or zone adjustments.</p>
          </header>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="base_price">Base price <span className="sf-req">*</span></label>
              <div className="sf-input-affix">
                <span className="sf-affix riyal-symbol">&#x20C1;</span>
                <input
                  id="base_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.base_price}
                  onChange={(e) => setField('base_price', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="sf-field">
              <label htmlFor="duration_min">Duration <span className="sf-req">*</span></label>
              <div className="sf-input-affix sf-input-affix--suffix">
                <input
                  id="duration_min"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="60"
                  value={form.duration_min}
                  onChange={(e) => setField('duration_min', e.target.value)}
                  disabled={saving}
                />
                <span className="sf-affix">min</span>
              </div>
            </div>
          </div>
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Appearance &amp; status</h2>
            <p>Icon and accent colour used for this service across the admin panel and app.</p>
          </header>

          <div className="sf-field">
            <label>Icon</label>
            <div className="sf-icons">
              {SERVICE_ICONS.map((entry) => {
                const Icon = entry.Icon
                return (
                  <button
                    key={entry.name}
                    type="button"
                    className={`sf-icon ${form.icon === entry.name ? 'is-selected' : ''}`}
                    style={{ '--accent': form.icon_color }}
                    onClick={() => setField('icon', entry.name)}
                    disabled={saving}
                    title={entry.name}
                    aria-label={`Select ${entry.name} icon`}
                    aria-pressed={form.icon === entry.name}
                  >
                    <Icon size={20} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="sf-field">
            <label>Accent colour</label>
            <div className="sf-swatches">
              {COLOR_SWATCHES.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`sf-swatch ${form.icon_color === color ? 'is-selected' : ''}`}
                  style={{ '--swatch': color }}
                  onClick={() => setField('icon_color', color)}
                  disabled={saving}
                  aria-label={`Select colour ${color}`}
                >
                  {form.icon_color === color && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>

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
              <em>Inactive services stay in the catalog but cannot be booked.</em>
            </span>
          </label>
        </section>

        <div className="sf-actions">
          <button
            type="button"
            className="sf-btn sf-btn--secondary"
            onClick={() => navigate('/admin/services')}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="sf-btn sf-btn--primary" disabled={saving}>
            {saving
              ? <><Loader2 size={16} className="spin" /> Saving…</>
              : isEdit ? 'Save changes' : 'Create service'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ServiceForm
