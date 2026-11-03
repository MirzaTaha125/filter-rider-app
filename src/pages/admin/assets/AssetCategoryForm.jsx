import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getServiceCategories,
  createServiceCategory,
  updateServiceCategory,
} from '../../../api'
import {
  AVAILABLE_ICONS, AVAILABLE_COLORS, DEFAULT_COLOR,
  toCategory, isIconUrl,
} from './categoryIcons'
import '../adminForm.css'
import './AssetCategoryForm.css'
import { PageShimmer } from '../../../components/Shimmer/Shimmer'
import ImageUploadField from '../../../components/ImageUpload/ImageUploadField'


const MAX_NAME_LENGTH = 100
const BACK_TO = '/admin/assets'
const PRICE_PATTERN = /^\d{1,10}(\.\d{1,2})?$/

const PRICE_SOURCES = [
  {
    value: 'AUTO',
    label: 'Automatic',
    hint: 'Worked out from the prices of this category’s active services.',
  },
  {
    value: 'MANUAL',
    label: 'Manual override',
    hint: 'You type the “price from” and “price to” shown to customers.',
  },
]

function money(value) {
  return Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function AssetCategoryForm() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(categoryId)

  const [form, setForm] = useState({
    name: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
    iconName: 'Car',
    color: DEFAULT_COLOR,
    displayOrder: '',
    priceSource: 'AUTO',
    priceFrom: '',
    priceTo: '',
    imageUrl: null,
  })
  // The AUTO range as last worked out by the API, shown read-only.
  const [autoRange, setAutoRange] = useState({ from: null, to: null })
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const list = await getServiceCategories(true)
      if (!isEdit) {
        // Default a new category to the end of the list.
        const max = list.reduce((m, c) => Math.max(m, Number(c.display_order) || 0), 0)
        setForm(prev => ({ ...prev, displayOrder: String(list.length ? max + 1 : 1) }))
        return
      }

      const row = list.find(item => String(item.id) === String(categoryId))
      if (!row) {
        setLoadError('Category not found')
        return
      }
      const category = toCategory(row)
      const isManual = category.priceSource === 'MANUAL'
      setForm({
        name: category.name ?? '',
        nameAr: category.nameAr ?? '',
        descriptionEn: category.descriptionEn ?? '',
        descriptionAr: category.descriptionAr ?? '',
        iconName: category.iconName || 'Car',
        color: category.color || DEFAULT_COLOR,
        displayOrder: String(category.displayOrder ?? 0),
        priceSource: category.priceSource,
        priceFrom: isManual && category.priceFrom != null ? String(Number(category.priceFrom)) : '',
        priceTo: isManual && category.priceTo != null ? String(Number(category.priceTo)) : '',
        imageUrl: category.imageUrl,
      })
      setAutoRange(isManual ? { from: null, to: null } : { from: category.priceFrom, to: category.priceTo })
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
    if (form.displayOrder !== '') {
      const n = Number(form.displayOrder)
      if (!Number.isInteger(n) || n < 0) return 'Display order must be a whole number (0 or more).'
    }
    if (form.priceSource === 'MANUAL') {
      const from = form.priceFrom.trim()
      const to = form.priceTo.trim()
      if (!from || !to) return 'Enter both “price from” and “price to” for a manual price.'
      if (!PRICE_PATTERN.test(from) || !PRICE_PATTERN.test(to)) {
        return 'Prices must be 0 or more with up to 2 decimals.'
      }
      if (Number(from) > Number(to)) return '“Price from” cannot be more than “price to”.'
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
      descriptionEn: form.descriptionEn.trim(),
      descriptionAr: form.descriptionAr.trim(),
      icon: form.iconName,
      color: form.color,
      imageUrl: form.imageUrl,
      displayOrder: form.displayOrder === '' ? 0 : Number(form.displayOrder),
      priceSource: form.priceSource,
      priceFrom: form.priceSource === 'MANUAL' ? Number(form.priceFrom).toFixed(2) : undefined,
      priceTo: form.priceSource === 'MANUAL' ? Number(form.priceTo).toFixed(2) : undefined,
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

  if (loading) {
    return (
      <div className="asset-form-page">
        <PageHeader title={title} onBack={() => navigate(BACK_TO)} />
        <PageShimmer />
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

      <form className="sf-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="sf-alert">
            <AlertTriangle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <div className="acf-pair">
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

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="descriptionEn">Description (English)</label>
              <textarea
                id="descriptionEn"
                rows={3}
                placeholder="Shown under the category name in the customer app"
                value={form.descriptionEn}
                onChange={(e) => setField('descriptionEn', e.target.value)}
                disabled={saving}
                maxLength={500}
              />
            </div>
            <div className="sf-field">
              <label htmlFor="descriptionAr">Description (Arabic)</label>
              <textarea
                id="descriptionAr"
                rows={3}
                dir="rtl"
                placeholder="تظهر تحت اسم الفئة في تطبيق العميل"
                value={form.descriptionAr}
                onChange={(e) => setField('descriptionAr', e.target.value)}
                disabled={saving}
                maxLength={500}
              />
            </div>
          </div>

          <div className="sf-field">
            <label htmlFor="displayOrder">Display order</label>
            <input
              id="displayOrder"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="e.g. 1"
              value={form.displayOrder}
              onChange={(e) => setField('displayOrder', e.target.value)}
              disabled={saving}
            />
            <span className="sf-hint">Whole number. Lower numbers are listed first in the app.</span>
          </div>
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Price range</h2>
            <p>The “from – to” price customers see on this category.</p>
          </header>

          <div className="sf-field">
            <label id="priceSourceLabel">Price source</label>
            <div className="acf-sources" role="radiogroup" aria-labelledby="priceSourceLabel">
              {PRICE_SOURCES.map(source => {
                const selected = form.priceSource === source.value
                return (
                  <button
                    key={source.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`acf-source ${selected ? 'is-selected' : ''}`}
                    onClick={() => setField('priceSource', source.value)}
                    disabled={saving}
                  >
                    <span className="acf-source-dot" />
                    <span className="acf-source-copy">
                      <strong>{source.label}</strong>
                      <em>{source.hint}</em>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {form.priceSource === 'AUTO' ? (
            <div className="acf-auto-range">
              <span className="acf-auto-label">Current range</span>
              <strong>
                {autoRange.from == null || autoRange.to == null ? (
                  isEdit ? 'No active services with a price yet' : 'Set once services are added'
                ) : (
                  <>
                    <span className="riyal-symbol">&#x20C1;</span>{money(autoRange.from)}
                    {' – '}
                    <span className="riyal-symbol">&#x20C1;</span>{money(autoRange.to)}
                  </>
                )}
              </strong>
              <span className="sf-hint">Updates by itself when service or size prices change.</span>
            </div>
          ) : (
            <div className="sf-grid sf-grid--2">
              <div className="sf-field">
                <label htmlFor="priceFrom">Price from <span className="sf-req">*</span></label>
                <div className="sf-input-affix">
                  <span className="sf-affix riyal-symbol">&#x20C1;</span>
                  <input
                    id="priceFrom"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="25.00"
                    value={form.priceFrom}
                    onChange={(e) => setField('priceFrom', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="sf-field">
                <label htmlFor="priceTo">Price to <span className="sf-req">*</span></label>
                <div className="sf-input-affix">
                  <span className="sf-affix riyal-symbol">&#x20C1;</span>
                  <input
                    id="priceTo"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="55.00"
                    value={form.priceTo}
                    onChange={(e) => setField('priceTo', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          )}
        </section>
        </div>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Appearance</h2>
            <p>Image, icon and colour used for the category.</p>
          </header>

          <ImageUploadField
            label="Category image"
            folder="service-categories"
            value={form.imageUrl}
            onChange={(url) => setField('imageUrl', url)}
            disabled={saving}
            hint="Shown on the category in the app. A wide photo works best."
          />

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
            <span className="sf-hint">Pick a preset, or upload a custom image below.</span>
          </div>

          <ImageUploadField
            label="Custom icon"
            folder="service-categories"
            compact
            value={isIconUrl(form.iconName) ? form.iconName : null}
            onChange={(url) => setField('iconName', url || 'Car')}
            disabled={saving}
            hint="Shown as the round icon on the category page. A square image works best."
          />

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
