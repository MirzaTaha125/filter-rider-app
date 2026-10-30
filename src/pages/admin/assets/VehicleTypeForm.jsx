import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getVehicleType,
  getVehicleTypes,
  getVehicleSizes,
  createVehicleType,
  updateVehicleType,
} from '../../../api'
import '../adminForm.css'
import './VehicleSizes.css'
import { PageShimmer } from '../../../components/Shimmer/Shimmer'
import ArabicField from '../../../components/ArabicField/ArabicField'

const BACK_TO = '/admin/assets/vehicle-types'
const MAX_NAME_LENGTH = 80

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function VehicleTypeForm() {
  const { typeId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(typeId)

  const [form, setForm] = useState({ name: '', name_ar: '', vehicle_size_id: '', display_order: '', is_active: true })
  const [sizes, setSizes] = useState([])
  const [otherTypes, setOtherTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [sizeList, typeList, current] = await Promise.all([
        getVehicleSizes(),
        getVehicleTypes().catch(() => []),
        isEdit ? getVehicleType(typeId) : null,
      ])
      setSizes(toArray(sizeList))
      setOtherTypes(toArray(typeList).filter(t => t.id !== typeId))

      if (isEdit) {
        if (!current?.id) {
          setLoadError('Vehicle type not found')
          return
        }
        setForm({
          name: current.name ?? '',
          name_ar: current.name_ar ?? '',
          vehicle_size_id: current.vehicle_size_id ?? '',
          display_order: String(current.display_order ?? 0),
          is_active: Boolean(current.is_active),
        })
      } else {
        // Default a new type to the end of the list.
        const list = toArray(typeList)
        const max = list.length ? Math.max(...list.map(t => Number(t.display_order) || 0)) : 0
        setForm(prev => ({ ...prev, display_order: String(list.length ? max + 1 : 1) }))
      }
    } catch (err) {
      setLoadError(err.message || 'Failed to load vehicle type')
    } finally {
      setLoading(false)
    }
  }, [typeId, isEdit])

  useEffect(() => { loadData() }, [loadData])

  // Only active sizes can be picked. When editing, the current size stays in
  // the list even if it has been deactivated since, so the form still shows it.
  const sizeOptions = sizes.filter(s => s.is_active || s.id === form.vehicle_size_id)
  const activeSizeCount = sizes.filter(s => s.is_active).length
  const selectedSize = sizes.find(s => s.id === form.vehicle_size_id)

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => ({ ...prev, [field]: '' }))
    setFormError('')
  }

  const validate = () => {
    const errors = {}
    const name = form.name.trim()

    if (!name) errors.name = 'Vehicle type name is required.'
    else if (name.length > MAX_NAME_LENGTH) errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`
    else if (otherTypes.some(t => (t.name || '').trim().toLowerCase() === name.toLowerCase())) {
      errors.name = 'Vehicle type name already exists'
    }

    if (!form.vehicle_size_id) errors.vehicle_size_id = 'Size is required.'

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
      vehicle_size_id: form.vehicle_size_id,
      display_order: form.display_order === '' ? 0 : Number(form.display_order),
      is_active: form.is_active,
    }

    try {
      if (isEdit) {
        await updateVehicleType(typeId, payload)
      } else {
        await createVehicleType(payload)
      }
      navigate(BACK_TO)
    } catch (err) {
      const message = err.message || 'Failed to save vehicle type'
      if (err.status === 409 || /name already exists/i.test(message)) {
        setFieldErrors(prev => ({ ...prev, name: 'Vehicle type name already exists' }))
      } else if (/vehicle size/i.test(message)) {
        setFieldErrors(prev => ({ ...prev, vehicle_size_id: message }))
      } else {
        setFormError(message)
      }
      setSaving(false)
    }
  }

  const title = isEdit ? 'Edit Vehicle Type' : 'Add Vehicle Type'

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
          <h2>Could not load vehicle type</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate(BACK_TO)}>
            Back to vehicle types
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="vehicle-size-form-page">
      <PageHeader
        title={title}
        subtitle={isEdit ? form.name : 'Link a vehicle type to one size'}
        onBack={() => navigate(BACK_TO)}
      />

      <form className="sf-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="sf-alert">
            <AlertTriangle size={16} />
            <span>{formError}</span>
          </div>
        )}

        {activeSizeCount === 0 && (
          <div className="sf-alert">
            <AlertTriangle size={16} />
            <span>
              There are no active vehicle sizes yet.{' '}
              <Link to="/admin/assets/vehicle-sizes/add">Add a size</Link> first, then come back.
            </span>
          </div>
        )}

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Vehicle type</h2>
            <p>Each vehicle type is linked to exactly one size. Inactive types are hidden from customers.</p>
          </header>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="vt-name">Vehicle type name <span className="sf-req">*</span></label>
              <input
                id="vt-name"
                type="text"
                placeholder="e.g. SUV"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                disabled={saving}
                maxLength={MAX_NAME_LENGTH}
                aria-invalid={Boolean(fieldErrors.name)}
                autoFocus={!isEdit}
              />
              {fieldErrors.name
                ? <span className="sf-hint vs-field-error">{fieldErrors.name}</span>
                : <span className="sf-hint">Must be unique (not case-sensitive).</span>}
            </div>

            <ArabicField
              id="vt-name-ar"
              label="Vehicle type name"
              placeholder="مثال: دفع رباعي"
              value={form.name_ar}
              onChange={(value) => setField('name_ar', value)}
              disabled={saving}
              maxLength={MAX_NAME_LENGTH}
            />

            <div className="sf-field">
              <label htmlFor="vt-size">Size <span className="sf-req">*</span></label>
              <select
                id="vt-size"
                value={form.vehicle_size_id}
                onChange={(e) => setField('vehicle_size_id', e.target.value)}
                disabled={saving || sizeOptions.length === 0}
                aria-invalid={Boolean(fieldErrors.vehicle_size_id)}
              >
                <option value="">Select a size…</option>
                {sizeOptions.map(size => (
                  <option key={size.id} value={size.id}>
                    {size.name}{size.is_active ? '' : ' (inactive)'}
                  </option>
                ))}
              </select>
              {fieldErrors.vehicle_size_id
                ? <span className="sf-hint vs-field-error">{fieldErrors.vehicle_size_id}</span>
                : selectedSize && !selectedSize.is_active
                  ? <span className="sf-hint sf-hint--warn">This size is inactive. You can keep it, or pick an active one.</span>
                  : <span className="sf-hint">Only active sizes from the Vehicle Size Master are listed.</span>}
            </div>

            <div className="sf-field">
              <label htmlFor="vt-order">Display order</label>
              <input
                id="vt-order"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="e.g. 10"
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

export default VehicleTypeForm
