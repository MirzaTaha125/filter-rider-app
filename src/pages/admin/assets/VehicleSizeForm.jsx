import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getVehicleSize,
  getVehicleSizes,
  createVehicleSize,
  updateVehicleSize,
} from '../../../api'
import '../adminForm.css'
import './VehicleSizes.css'
import { PageShimmer } from '../../../components/Shimmer/Shimmer'
import ArabicField from '../../../components/ArabicField/ArabicField'
import { MAX_CODE_LENGTH, CODE_PATTERN, suggestCode } from './vehicleSizeCode'

const BACK_TO = '/admin/assets/vehicle-sizes'
const MAX_NAME_LENGTH = 80

function VehicleSizeForm() {
  const { sizeId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(sizeId)

  const [form, setForm] = useState({ name: '', name_ar: '', code: '', display_order: '', is_active: true })
  // While false, Code follows Name. Typing in Code stops that.
  const [codeTouched, setCodeTouched] = useState(isEdit)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      if (isEdit) {
        const size = await getVehicleSize(sizeId)
        if (!size?.id) {
          setLoadError('Vehicle size not found')
          return
        }
        setForm({
          name: size.name ?? '',
          name_ar: size.name_ar ?? '',
          code: size.code ?? '',
          display_order: String(size.display_order ?? 0),
          is_active: Boolean(size.is_active),
        })
      } else {
        // Default a new size to the end of the list.
        const list = await getVehicleSizes().catch(() => [])
        const max = Array.isArray(list) && list.length
          ? Math.max(...list.map(s => Number(s.display_order) || 0))
          : 0
        setForm(prev => ({ ...prev, display_order: String(list.length ? max + 1 : 1) }))
      }
    } catch (err) {
      setLoadError(err.message || 'Failed to load vehicle size')
    } finally {
      setLoading(false)
    }
  }, [sizeId, isEdit])

  useEffect(() => { loadData() }, [loadData])

  const setField = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'name' && !codeTouched) next.code = suggestCode(value)
      return next
    })
    setFieldErrors(prev => ({ ...prev, [field]: '', ...(field === 'name' && !codeTouched ? { code: '' } : {}) }))
    setFormError('')
  }

  const validate = () => {
    const errors = {}
    const name = form.name.trim()
    const code = form.code.trim()

    if (!name) errors.name = 'Name is required.'
    else if (name.length > MAX_NAME_LENGTH) errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`

    if (!code) errors.code = 'Code is required.'
    else if (code.length > MAX_CODE_LENGTH) errors.code = `Code must be ${MAX_CODE_LENGTH} characters or fewer.`
    else if (!CODE_PATTERN.test(code)) errors.code = 'Use lowercase letters, digits and underscores only (a-z, 0-9, _).'

    if (form.display_order !== '') {
      const n = Number(form.display_order)
      if (!Number.isInteger(n) || n < 0) errors.display_order = 'Display order must be a whole number (0 or more).'
    }
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validate()
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors)
      return
    }

    setSaving(true)
    setFormError('')
    const payload = {
      name: form.name.trim(),
      name_ar: form.name_ar.trim(),
      code: form.code.trim(),
      display_order: form.display_order === '' ? 0 : Number(form.display_order),
      is_active: form.is_active,
    }

    try {
      if (isEdit) {
        await updateVehicleSize(sizeId, payload)
      } else {
        await createVehicleSize(payload)
      }
      navigate(BACK_TO)
    } catch (err) {
      const message = err.message || 'Failed to save vehicle size'
      if (err.status === 409 || /code already exists/i.test(message)) {
        setFieldErrors(prev => ({ ...prev, code: 'Code already exists' }))
      } else {
        setFormError(message)
      }
      setSaving(false)
    }
  }

  const title = isEdit ? 'Edit Size' : 'Add New Size'

  if (loading) {
    return (
      <div className="vehicle-size-form-page">
        <PageHeader title={title} onBack={() => navigate(BACK_TO)} />
        <PageShimmer />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="vehicle-size-form-page">
        <PageHeader title={title} onBack={() => navigate(BACK_TO)} />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load vehicle size</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate(BACK_TO)}>
            Back to vehicle sizes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="vehicle-size-form-page">
      <PageHeader
        title={title}
        subtitle={isEdit ? form.name : 'Add a size to the vehicle size master'}
        onBack={() => navigate(BACK_TO)}
      />

      <form className="sf-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="sf-alert">
            <AlertTriangle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Vehicle size</h2>
            <p>Sizes are listed by display order, lowest first. Inactive sizes are hidden from customers.</p>
          </header>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="vs-name">Name <span className="sf-req">*</span></label>
              <input
                id="vs-name"
                type="text"
                placeholder="e.g. Large"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                disabled={saving}
                maxLength={MAX_NAME_LENGTH}
                aria-invalid={Boolean(fieldErrors.name)}
                autoFocus={!isEdit}
              />
              {fieldErrors.name
                ? <span className="sf-hint vs-field-error">{fieldErrors.name}</span>
                : <span className="sf-hint">The label admins and customers see.</span>}
            </div>

            <ArabicField
              id="vs-name-ar"
              label="Name"
              placeholder="مثال: كبير"
              value={form.name_ar}
              onChange={(value) => setField('name_ar', value)}
              disabled={saving}
              maxLength={MAX_NAME_LENGTH}
            />

            <div className="sf-field">
              <label htmlFor="vs-code">Code <span className="sf-req">*</span></label>
              <input
                id="vs-code"
                type="text"
                placeholder="e.g. large"
                value={form.code}
                onChange={(e) => {
                  setCodeTouched(true)
                  setField('code', e.target.value.toLowerCase())
                }}
                disabled={saving}
                maxLength={MAX_CODE_LENGTH}
                aria-invalid={Boolean(fieldErrors.code)}
                className="vs-code-input"
              />
              {fieldErrors.code
                ? <span className="sf-hint vs-field-error">{fieldErrors.code}</span>
                : (
                  <span className="sf-hint">
                    {!isEdit && !codeTouched
                      ? 'Suggested from the name. Must be unique: a-z, 0-9 and _ only.'
                      : 'Must be unique: a-z, 0-9 and _ only.'}
                  </span>
                )}
            </div>

            <div className="sf-field">
              <label htmlFor="vs-order">Display order</label>
              <input
                id="vs-order"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="e.g. 3"
                value={form.display_order}
                onChange={(e) => setField('display_order', e.target.value)}
                disabled={saving}
                aria-invalid={Boolean(fieldErrors.display_order)}
              />
              {fieldErrors.display_order
                ? <span className="sf-hint vs-field-error">{fieldErrors.display_order}</span>
                : <span className="sf-hint">Whole number. Lower numbers appear first.</span>}
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
              <strong>{form.is_active ? 'Active' : 'Inactive'}</strong>
              <em>{form.is_active ? 'Available for selection.' : 'Hidden from customers.'}</em>
            </span>
          </label>
        </section>

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
              : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default VehicleSizeForm
