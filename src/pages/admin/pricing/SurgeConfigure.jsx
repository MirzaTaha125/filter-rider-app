import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import { getSurgeRules, saveSurgeRules } from '../../../api/pricing.js'
import {
  DEMAND_LABELS,
  DEMAND_BLURBS,
  DEFAULT_RULES,
  orderRules,
  checkCoverage,
} from './surgeRules.js'
import '../adminForm.css'
import './SurgeConfigure.css'

function SurgeConfigure() {
  const navigate = useNavigate()
  const [rules, setRules] = useState(() => orderRules(DEFAULT_RULES))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    let cancelled = false

    getSurgeRules()
      .then(data => {
        if (cancelled) return
        const saved = Array.isArray(data) ? data : []
        setRules(orderRules(saved.length > 0 ? saved : DEFAULT_RULES))
      })
      .catch(err => {
        if (!cancelled) setLoadError(err.message || 'Failed to load surge rules')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  const setRuleField = (level, field, rawValue) => {
    setFormError('')
    setRules(prev => prev.map(rule => {
      if (rule.demand_level !== level) return rule
      if (field === 'is_active') return { ...rule, is_active: rawValue }
      // Keep the raw string in state so the field can be cleared while typing.
      return { ...rule, [field]: rawValue }
    }))
  }

  const asNumber = (value) => (value === '' || value === null ? NaN : Number(value))

  const validate = () => {
    for (const rule of rules) {
      const label = DEMAND_LABELS[rule.demand_level]

      const multiplier = asNumber(rule.multiplier)
      if (Number.isNaN(multiplier) || multiplier < 0) {
        return `${label}: multiplier must be a number of 0 or more.`
      }

      const min = asNumber(rule.min_availability)
      const max = asNumber(rule.max_availability)
      if (!Number.isInteger(min) || min < 0 || min > 100) {
        return `${label}: minimum availability must be a whole number between 0 and 100.`
      }
      if (!Number.isInteger(max) || max < 0 || max > 100) {
        return `${label}: maximum availability must be a whole number between 0 and 100.`
      }
      if (min > max) {
        return `${label}: minimum availability (${min}%) cannot be above the maximum (${max}%).`
      }
    }
    return ''
  }

  // Live coverage feedback, computed from whatever is currently typed.
  const numericRules = rules.map(r => ({
    ...r,
    multiplier: asNumber(r.multiplier),
    min_availability: asNumber(r.min_availability),
    max_availability: asNumber(r.max_availability),
  }))
  const coverageReady = numericRules.every(
    r => Number.isInteger(r.min_availability) && Number.isInteger(r.max_availability)
      && r.min_availability <= r.max_availability,
  )
  const { gaps, overlaps } = coverageReady
    ? checkCoverage(numericRules)
    : { gaps: [], overlaps: [] }

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
      await saveSurgeRules(numericRules.map(rule => ({
        demand_level: rule.demand_level,
        multiplier: rule.multiplier,
        min_availability: rule.min_availability,
        max_availability: rule.max_availability,
        is_active: rule.is_active,
      })))
      navigate('/admin/pricing/surge')
    } catch (err) {
      setFormError(err.message || 'Failed to save surge rules')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="surge-configure-page">
        <PageHeader title="Configure Surge Rules" />
        <div className="sf-state"><Loader2 size={32} className="spin" /><span>Loading…</span></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="surge-configure-page">
        <PageHeader title="Configure Surge Rules" />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load surge rules</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate('/admin/pricing/surge')}>
            Back to surge pricing
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="surge-configure-page">
      <PageHeader
        title="Configure Surge Rules"
        subtitle="Set the multiplier applied at each level of provider availability"
      />

      <form className="sf-form" onSubmit={handleSubmit}>
        {formError && (
          <div className="sf-alert">
            <AlertTriangle size={16} />
            <span>{formError}</span>
          </div>
        )}

        {(gaps.length > 0 || overlaps.length > 0) && (
          <div className="sc-warning">
            <AlertTriangle size={16} />
            <span>
              {gaps.length > 0 && <>No active rule covers {gaps.join(', ')} availability. </>}
              {overlaps.length > 0 && <>More than one rule covers {overlaps.join(', ')}. </>}
              You can still save, but bookings in those ranges may be priced unpredictably.
            </span>
          </div>
        )}

        {rules.map(rule => (
          <section key={rule.demand_level} className="sf-card">
            <header className="sf-card-head">
              <h2>{DEMAND_LABELS[rule.demand_level]}</h2>
              <p>{DEMAND_BLURBS[rule.demand_level]}</p>
            </header>

            <div className="sf-grid sf-grid--2">
              <div className="sf-field">
                <label htmlFor={`multiplier-${rule.demand_level}`}>
                  Price multiplier <span className="sf-req">*</span>
                </label>
                <div className="sf-input-affix">
                  <input
                    id={`multiplier-${rule.demand_level}`}
                    type="number"
                    min="0"
                    step="0.1"
                    value={rule.multiplier}
                    onChange={(e) => setRuleField(rule.demand_level, 'multiplier', e.target.value)}
                    disabled={saving}
                  />
                  <span className="sf-affix">×</span>
                </div>
                <span className="sf-hint">1.0 charges the normal price; 1.5 adds 50%.</span>
              </div>

              <div className="sc-range">
                <div className="sf-field">
                  <label htmlFor={`min-${rule.demand_level}`}>
                    Availability from <span className="sf-req">*</span>
                  </label>
                  <div className="sf-input-affix">
                    <input
                      id={`min-${rule.demand_level}`}
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={rule.min_availability}
                      onChange={(e) => setRuleField(rule.demand_level, 'min_availability', e.target.value)}
                      disabled={saving}
                    />
                    <span className="sf-affix">%</span>
                  </div>
                </div>

                <div className="sf-field">
                  <label htmlFor={`max-${rule.demand_level}`}>
                    up to <span className="sf-req">*</span>
                  </label>
                  <div className="sf-input-affix">
                    <input
                      id={`max-${rule.demand_level}`}
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={rule.max_availability}
                      onChange={(e) => setRuleField(rule.demand_level, 'max_availability', e.target.value)}
                      disabled={saving}
                    />
                    <span className="sf-affix">%</span>
                  </div>
                </div>
              </div>
            </div>

            <label className="sf-toggle">
              <input
                type="checkbox"
                checked={rule.is_active}
                onChange={(e) => setRuleField(rule.demand_level, 'is_active', e.target.checked)}
                disabled={saving}
              />
              <span className="sf-toggle-track"><span className="sf-toggle-thumb" /></span>
              <span className="sf-toggle-copy">
                <strong>Active</strong>
                <em>When off, this band is skipped and no multiplier is applied to it.</em>
              </span>
            </label>
          </section>
        ))}

        <div className="sf-actions">
          <button
            type="button"
            className="sf-btn sf-btn--secondary"
            onClick={() => navigate('/admin/pricing/surge')}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="sf-btn sf-btn--primary" disabled={saving}>
            {saving
              ? <><Loader2 size={16} className="spin" /> Saving…</>
              : 'Save rules'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default SurgeConfigure
