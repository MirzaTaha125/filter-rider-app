import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getRegionalPricing,
  getRegionalPricingById,
  createRegionalPricing,
  updateRegionalPricing,
} from '../../../api/pricing.js'
import { getZones } from '../../../api/zones.js'
import '../adminForm.css'
import './RegionForm.css'

const EMPTY_FORM = {
  zoneId: '',
  basePrice: '',
  commissionPercent: '',
  isActive: true,
}

function toZoneList(data) {
  if (Array.isArray(data)) return data
  return data?.zones ?? data?.items ?? data?.data ?? []
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function RegionForm() {
  const { regionId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(regionId)

  const [form, setForm] = useState(EMPTY_FORM)
  const [zones, setZones] = useState([])
  const [takenZoneIds, setTakenZoneIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [zonesData, regions] = await Promise.all([
        getZones(),
        getRegionalPricing(),
      ])
      setZones(toZoneList(zonesData))

      // A zone can only have one pricing row, so hide ones already configured.
      const assigned = new Set(toArray(regions).map(r => r.zone_id))

      if (!isEdit) {
        setTakenZoneIds(assigned)
        return
      }

      const region = await getRegionalPricingById(regionId)
      if (!region?.id) {
        setLoadError('Regional pricing entry not found')
        return
      }

      assigned.delete(region.zone_id) // its own zone is not a conflict
      setTakenZoneIds(assigned)
      setForm({
        zoneId: region.zone_id ?? '',
        basePrice: String(region.base_price ?? ''),
        commissionPercent: String(region.commission_percent ?? ''),
        isActive: region.is_active !== false,
      })
    } catch (err) {
      setLoadError(err.message || 'Failed to load regional pricing')
    } finally {
      setLoading(false)
    }
  }, [regionId, isEdit])

  useEffect(() => { loadData() }, [loadData])

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const validate = () => {
    if (!form.zoneId) return 'Please choose a zone.'

    const price = Number(form.basePrice)
    if (form.basePrice === '' || Number.isNaN(price) || price < 0) {
      return 'Base price must be a valid number of 0 or more.'
    }

    const commission = Number(form.commissionPercent)
    if (form.commissionPercent === '' || Number.isNaN(commission)) {
      return 'Commission is required — enter 0 if this region takes no commission.'
    }
    if (commission < 0 || commission > 100) {
      return 'Commission must be between 0 and 100 percent.'
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
      zoneId: form.zoneId,
      basePrice: Number(form.basePrice),
      commissionPercent: Number(form.commissionPercent),
      isActive: form.isActive,
    }

    try {
      if (isEdit) {
        await updateRegionalPricing(regionId, payload)
      } else {
        await createRegionalPricing(payload)
      }
      navigate('/admin/pricing/regional')
    } catch (err) {
      setFormError(err.message || 'Failed to save regional pricing')
      setSaving(false)
    }
  }

  const selectableZones = zones.filter(z => isEdit || !takenZoneIds.has(z.id))
  const title = isEdit ? 'Edit Region' : 'Add New Region'
  const zoneLabel = (zone) => `${zone.zone_name}${zone.city ? ` — ${zone.city}` : ''}`

  if (loading) {
    return (
      <div className="region-form-page">
        <PageHeader title={title} />
        <div className="sf-state"><Loader2 size={32} className="spin" /><span>Loading…</span></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="region-form-page">
        <PageHeader title={title} />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load region</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate('/admin/pricing/regional')}>
            Back to regional pricing
          </button>
        </div>
      </div>
    )
  }

  const noZonesLeft = !isEdit && selectableZones.length === 0

  return (
    <div className="region-form-page">
      <PageHeader
        title={title}
        subtitle={isEdit
          ? zones.find(z => z.id === form.zoneId)?.zone_name
          : 'Override pricing and commission for one zone'}
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
            <h2>Zone</h2>
            <p>Each zone can have one pricing entry.</p>
          </header>

          <div className="sf-field">
            <label htmlFor="zoneId">Zone <span className="sf-req">*</span></label>
            <select
              id="zoneId"
              value={form.zoneId}
              onChange={(e) => setField('zoneId', e.target.value)}
              disabled={saving || isEdit || noZonesLeft}
            >
              <option value="">Select a zone…</option>
              {selectableZones.map(zone => (
                <option key={zone.id} value={zone.id}>{zoneLabel(zone)}</option>
              ))}
            </select>
            {isEdit ? (
              <span className="sf-hint">
                The zone cannot be changed. Delete this entry and create a new one instead.
              </span>
            ) : zones.length === 0 ? (
              <span className="sf-hint sf-hint--warn">
                No zones found. Create a zone under Zones first.
              </span>
            ) : noZonesLeft ? (
              <span className="sf-hint sf-hint--warn">
                Every zone already has regional pricing. Edit an existing entry instead.
              </span>
            ) : null}
          </div>
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Pricing &amp; commission</h2>
            <p>Applies to bookings placed inside this zone.</p>
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
              <label htmlFor="commissionPercent">Commission <span className="sf-req">*</span></label>
              <div className="sf-input-affix">
                <input
                  id="commissionPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                  value={form.commissionPercent}
                  onChange={(e) => setField('commissionPercent', e.target.value)}
                  disabled={saving}
                />
                <span className="sf-affix">%</span>
              </div>
              <span className="sf-hint">Share of each booking the platform keeps in this zone.</span>
            </div>
          </div>
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Status</h2>
            <p>Controls whether this override is used when quoting a booking.</p>
          </header>

          <label className="sf-toggle">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setField('isActive', e.target.checked)}
              disabled={saving}
            />
            <span className="sf-toggle-track"><span className="sf-toggle-thumb" /></span>
            <span className="sf-toggle-copy">
              <strong>Active</strong>
              <em>When off, this zone falls back to the standard platform pricing.</em>
            </span>
          </label>
        </section>

        <div className="sf-actions">
          <button
            type="button"
            className="sf-btn sf-btn--secondary"
            onClick={() => navigate('/admin/pricing/regional')}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="sf-btn sf-btn--primary" disabled={saving || noZonesLeft}>
            {saving
              ? <><Loader2 size={16} className="spin" /> Saving…</>
              : isEdit ? 'Save changes' : 'Create region'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default RegionForm
