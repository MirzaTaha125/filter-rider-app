import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getSizeCategory,
  createSizeCategory,
  updateSizeCategory,
} from '../../../api'
import '../adminForm.css'
import './SizeCategoryForm.css'

// multiplier is Decimal(6,3) in the database.
const MAX_MULTIPLIER = 999.999
const MAX_DECIMALS = 3
const MAX_NAME_LENGTH = 80

function describeMultiplier(value) {
  const n = Number(value)
  if (value === '' || Number.isNaN(n)) return null
  if (n === 1) return 'Charged at the standard price.'
  if (n === 0) return 'This size is free.'
  const pct = Math.abs((n - 1) * 100)
  const rounded = Number(pct.toFixed(1))
  return n > 1
    ? `Adds ${rounded}% to the price.`
    : `Takes ${rounded}% off the price.`
}

function SizeCategoryForm() {
  const { sizeId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(sizeId)

  const [form, setForm] = useState({ name: '', multiplier: '1.0' })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

  const loadData = useCallback(async () => {
    if (!isEdit) return
    setLoading(true)
    setLoadError('')
    try {
      const size = await getSizeCategory(sizeId)
      if (!size?.id) {
        setLoadError('Size category not found')
        return
      }
      setForm({
        name: size.name ?? '',
        multiplier: String(size.multiplier ?? '1.0'),
      })
    } catch (err) {
      setLoadError(err.message || 'Failed to load size category')
    } finally {
      setLoading(false)
    }
  }, [sizeId, isEdit])

  useEffect(() => { loadData() }, [loadData])

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const validate = () => {
    const name = form.name.trim()
    if (!name) return 'Category name is required.'
    if (name.length > MAX_NAME_LENGTH) {
      return `Category name must be ${MAX_NAME_LENGTH} characters or fewer.`
    }

    const multiplier = Number(form.multiplier)
    if (form.multiplier === '' || Number.isNaN(multiplier)) {
      return 'Multiplier is required — use 1.0 for no change.'
    }
    if (multiplier < 0) return 'Multiplier cannot be negative.'
    if (multiplier > MAX_MULTIPLIER) {
      return `Multiplier cannot be above ${MAX_MULTIPLIER}.`
    }
    const decimals = (form.multiplier.split('.')[1] ?? '').length
    if (decimals > MAX_DECIMALS) {
      return `Multiplier supports at most ${MAX_DECIMALS} decimal places.`
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
      multiplier: String(Number(form.multiplier)),
    }

    try {
      if (isEdit) {
        await updateSizeCategory(sizeId, payload)
      } else {
        await createSizeCategory(payload)
      }
      navigate('/admin/assets/sizes')
    } catch (err) {
      setFormError(err.message || 'Failed to save size category')
      setSaving(false)
    }
  }

  const title = isEdit ? 'Edit Size Category' : 'Add Size Category'
  const hint = describeMultiplier(form.multiplier)

  if (loading) {
    return (
      <div className="size-form-page">
        <PageHeader title={title} />
        <div className="sf-state"><Loader2 size={32} className="spin" /><span>Loading…</span></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="size-form-page">
        <PageHeader title={title} />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load size category</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate('/admin/assets/sizes')}>
            Back to size categories
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="size-form-page">
      <PageHeader
        title={title}
        subtitle={isEdit ? form.name : 'Group assets by size and scale their price'}
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
            <h2>Size category</h2>
            <p>Used by the pricing matrix and by customer vehicles.</p>
          </header>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="name">Category name <span className="sf-req">*</span></label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Small, Medium, Large"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                disabled={saving}
                maxLength={MAX_NAME_LENGTH}
              />
              <span className="sf-hint">Names must be unique.</span>
            </div>

            <div className="sf-field">
              <label htmlFor="multiplier">Price multiplier <span className="sf-req">*</span></label>
              <div className="sf-input-affix">
                <input
                  id="multiplier"
                  type="number"
                  min="0"
                  max={MAX_MULTIPLIER}
                  step="0.01"
                  placeholder="1.0"
                  value={form.multiplier}
                  onChange={(e) => setField('multiplier', e.target.value)}
                  disabled={saving}
                />
                <span className="sf-affix">×</span>
              </div>
              <span className="sf-hint">
                {hint ?? 'Use 1.0 for no change to the price.'}
              </span>
            </div>
          </div>
        </section>

        <div className="sf-actions">
          <button
            type="button"
            className="sf-btn sf-btn--secondary"
            onClick={() => navigate('/admin/assets/sizes')}
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

export default SizeCategoryForm
