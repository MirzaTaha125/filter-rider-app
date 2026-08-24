import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getServiceCategory,
  createServiceCategory,
  updateServiceCategory,
} from '../../../api'
import {
  ICON_MAP, DEFAULT_ICON, AVAILABLE_ICONS, AVAILABLE_COLORS, DEFAULT_COLOR,
  toCategory,
} from './categoryIcons'
import '../adminForm.css'
import './AssetCategoryForm.css'

const MAX_NAME_LENGTH = 100
const BACK_TO = '/admin/assets'

function AssetCategoryForm() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(categoryId)

  const [form, setForm] = useState({
    name: '',
    nameAr: '',
    iconName: 'Car',
    color: DEFAULT_COLOR,
  })
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

  const loadData = useCallback(async () => {
    if (!isEdit) return
    setLoading(true)
    setLoadError('')
    try {
      const row = await getServiceCategory(categoryId)
      if (!row) {
        setLoadError('Category not found')
        return
      }
      const category = toCategory(row)
      setForm({
        name: category.name ?? '',
        nameAr: category.nameAr ?? '',
        iconName: category.iconName || 'Car',
        color: category.color || DEFAULT_COLOR,
      })
      setIsActive(category.isActive !== false)
    } catch (err) {
      setLoadError(err.message || 'Failed to load category')
    } finally {
      setLoading(false)
    }
  }, [categoryId, isEdit])

  useEffect(() => { loadData() }, [loadData])

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const validate = () => {
    const name = form.name.trim()
    if (!name) return 'Category name (English) is required.'
    if (name.length > MAX_NAME_LENGTH) {
      return `Category name must be ${MAX_NAME_LENGTH} characters or fewer.`
    }
    if (form.nameAr.length > MAX_NAME_LENGTH) {
      return `Arabic name must be ${MAX_NAME_LENGTH} characters or fewer.`
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
    // title_ar is required by the API, so it falls back to the English name.
    const payload = {
      name: form.name.trim(),
      nameAr: form.nameAr.trim() || form.name.trim(),
      icon: form.iconName,
      color: form.color,
    }

    try {
      if (isEdit) {
        await updateServiceCategory(categoryId, { ...payload, isActive })
      } else {
        await createServiceCategory(payload)
      }
      navigate(BACK_TO)
    } catch (err) {
      setFormError(err.message || 'Failed to save category')
      setSaving(false)
    }
  }

  const title = isEdit ? 'Edit Asset Category' : 'Add Asset Category'
  const PreviewIcon = ICON_MAP[form.iconName] || DEFAULT_ICON

  if (loading) {
    return (
      <div className="asset-form-page">
        <PageHeader title={title} onBack={() => navigate(BACK_TO)} />
        <div className="sf-state"><Loader2 size={32} className="spin" /><span>Loading…</span></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="asset-form-page">
        <PageHeader title={title} onBack={() => navigate(BACK_TO)} />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load category</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate(BACK_TO)}>
            Back to categories
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="asset-form-page">
      <PageHeader
        title={title}
        subtitle={isEdit ? form.name : 'Group the assets a service is booked against'}
        onBack={() => navigate(BACK_TO)}
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
            <h2>Category details</h2>
            <p>Shown to customers when they pick what the service is for.</p>
          </header>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="name">Name (English) <span className="sf-req">*</span></label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Vehicle"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                disabled={saving}
                maxLength={MAX_NAME_LENGTH}
                autoFocus
              />
            </div>

            <div className="sf-field">
              <label htmlFor="nameAr">Name (Arabic)</label>
              <input
                id="nameAr"
                type="text"
                dir="rtl"
                placeholder="مركبة"
                value={form.nameAr}
                onChange={(e) => setField('nameAr', e.target.value)}
                disabled={saving}
                maxLength={MAX_NAME_LENGTH}
              />
              <span className="sf-hint">Falls back to the English name if left blank.</span>
            </div>
          </div>
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Appearance</h2>
            <p>Pick the icon and colour used on the category card.</p>
          </header>

          <div className="sf-field">
            <label>Icon</label>
            <div className="acf-icons">
              {AVAILABLE_ICONS.map((option) => {
                const name = option.name
                const OptionIcon = option.component
                const selected = form.iconName === name
                return (
                  <button
                    key={name}
                    type="button"
                    className={`acf-icon ${selected ? 'is-selected' : ''}`}
                    onClick={() => setField('iconName', name)}
                    disabled={saving}
                    aria-pressed={selected}
                    aria-label={name}
                    title={name}
                    style={selected ? {
                      backgroundColor: `${form.color}1a`,
                      color: form.color,
                      borderColor: form.color,
                    } : undefined}
                  >
                    <OptionIcon size={22} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="sf-field">
            <label>Colour</label>
            <div className="acf-colors">
              {AVAILABLE_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`acf-color ${form.color === color ? 'is-selected' : ''}`}
                  onClick={() => setField('color', color)}
                  disabled={saving}
                  aria-pressed={form.color === color}
                  aria-label={`Colour ${color}`}
                  title={color}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="sf-field">
            <label>Preview</label>
            <div className="acf-preview">
              <div
                className="acf-preview-icon"
                style={{ backgroundColor: `${form.color}1a`, color: form.color }}
              >
                <PreviewIcon size={30} />
              </div>
              <div className="acf-preview-text">
                <strong>{form.name.trim() || 'Category name'}</strong>
                <span dir="rtl">{form.nameAr.trim() || 'اسم الفئة'}</span>
              </div>
            </div>
          </div>
        </section>

        {isEdit && (
          <section className="sf-card">
            <header className="sf-card-head">
              <h2>Availability</h2>
              <p>An inactive category stays in the catalog but is hidden from customers.</p>
            </header>

            <label className="sf-toggle">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={saving}
              />
              <span className="sf-toggle-track"><span className="sf-toggle-thumb" /></span>
              <span className="sf-toggle-copy">
                <strong>{isActive ? 'Active' : 'Inactive'}</strong>
                <em>{isActive ? 'Visible to customers.' : 'Hidden from customers.'}</em>
              </span>
            </label>
          </section>
        )}

        <div className="sf-actions">
          <button
            type="button"
            className="sf-btn sf-btn--secondary"
            onClick={() => navigate(BACK_TO)}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="sf-btn sf-btn--primary" disabled={saving}>
            {saving
              ? <><Loader2 size={16} className="spin" /> Saving…</>
              : isEdit ? 'Save changes' : 'Create category'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AssetCategoryForm
