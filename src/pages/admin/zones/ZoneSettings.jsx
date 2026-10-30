import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle, CheckCircle2, Radar, Truck } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import { getZoneSettings, saveZoneSettings } from '../../../api'
import '../adminForm.css'
import './ZoneSettings.css'
import { PageShimmer } from '../../../components/Shimmer/Shimmer'


/** The customer's search round in the app (backend SEARCH_ROUND_MS). */
const SEARCH_ROUND_SECONDS = 5 * 60

const FIELDS = {
  start_radius_km: { label: 'Starting radius', unit: 'km', min: 0.5, max: 200, step: 0.5 },
  step_km: { label: 'Grow the radius by', unit: 'km', min: 0.5, max: 100, step: 0.5 },
  step_seconds: { label: 'Wait before growing', unit: 'seconds', min: 10, max: 3600, step: 5 },
  max_radius_km: { label: 'Maximum radius', unit: 'km', min: 0.5, max: 500, step: 0.5 },
  provider_max_travel_km: { label: 'Maximum travel distance', unit: 'km', min: 0.5, max: 500, step: 0.5 },
  location_max_age_minutes: { label: 'Ignore providers whose location is older than', unit: 'minutes', min: 1, max: 1440, step: 1 },
}

const toForm = (s) => Object.fromEntries(
  Object.entries(s).map(([k, v]) => [k, typeof v === 'boolean' ? v : String(v)]),
)

/** The radius at each step until the maximum or the end of the customer's search round. */
function steps(form) {
  const start = Number(form.start_radius_km)
  const step = Number(form.step_km)
  const wait = Number(form.step_seconds)
  const max = Number(form.max_radius_km)
  if (![start, step, wait, max].every(n => Number.isFinite(n) && n > 0) || start > max) return null
  const out = []
  let radius = start
  let t = 0
  while (out.length < 40) {
    out.push({ t, radius })
    if (radius >= max) break
    t += wait
    if (t >= SEARCH_ROUND_SECONDS) break
    radius = Math.min(Math.round((radius + step) * 100) / 100, max)
  }
  return { out, reachesMax: out[out.length - 1].radius >= max }
}

const clock = (sec) => (sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m${sec % 60 ? ` ${sec % 60}s` : ''}`)

/**
 * Zone Settings: how far an order searches for a provider and how far a
 * provider is asked to travel. Stored once for the whole app (Zones are hidden
 * for now). Distance dispatch is off until switched on here.
 */
function ZoneSettings() {
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getZoneSettings()
      .then(s => { setForm(toForm(s)); setSaved(s) })
      .catch(e => setLoadError(e.message || 'Could not load the zone settings'))
  }, [])

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setFormError('')
    setNotice('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    for (const [key, f] of Object.entries(FIELDS)) {
      const v = Number(form[key])
      if (!Number.isFinite(v) || v < f.min || v > f.max) {
        setFormError(`${f.label} must be between ${f.min} and ${f.max} ${f.unit}.`)
        return
      }
    }
    if (Number(form.start_radius_km) > Number(form.max_radius_km)) {
      setFormError('The starting radius cannot be larger than the maximum radius.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const payload = Object.fromEntries(
        Object.keys(FIELDS).map(k => [k, Number(form[k])]),
      )
      payload.enabled = Boolean(form.enabled)
      const s = await saveZoneSettings(payload)
      setForm(toForm(s))
      setSaved(s)
      setNotice('Saved. New orders use these settings right away.')
    } catch (err) {
      setFormError(err.message || 'Could not save the zone settings')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="zone-settings-page">
        <PageHeader title="Zone Settings" />
        <div className="sf-state sf-state--error"><AlertTriangle size={32} /><h2>Could not load</h2><p>{loadError}</p></div>
      </div>
    )
  }
  if (!form) {
    return (
      <div className="zone-settings-page">
        <PageHeader title="Zone Settings" />
        <PageShimmer />
      </div>
    )
  }

  const plan = steps(form)
  const providerKm = Number(form.provider_max_travel_km)
  const dirty = saved && JSON.stringify(toForm(saved)) !== JSON.stringify(form)

  const numberField = (key) => {
    const f = FIELDS[key]
    return (
      <div className="sf-field" key={key}>
        <label htmlFor={key}>{f.label}</label>
        <div className="zs-input">
          <input
            id={key}
            type="number"
            inputMode="decimal"
            min={f.min}
            max={f.max}
            step={f.step}
            value={form[key]}
            onChange={(e) => setField(key, e.target.value)}
            disabled={saving}
          />
          <span>{f.unit}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="zone-settings-page">
      <PageHeader title="Zone Settings" subtitle="How far orders look for a provider, and how far providers travel" />

      <form className="sf-form" onSubmit={handleSubmit}>
        {formError && <div className="sf-alert"><AlertTriangle size={16} /><span>{formError}</span></div>}
        {notice && <div className="zs-notice"><CheckCircle2 size={16} /><span>{notice}</span></div>}

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Distance-based dispatch</h2>
            <p>When off, every available provider of the service gets every order (how it works today).</p>
          </header>
          <label className="sf-toggle">
            <input
              type="checkbox"
              checked={Boolean(form.enabled)}
              onChange={(e) => setField('enabled', e.target.checked)}
              disabled={saving}
            />
            <span className="sf-toggle-track"><span className="sf-toggle-thumb" /></span>
            <span className="sf-toggle-copy">
              <strong>{form.enabled ? 'On' : 'Off'}</strong>
              <em>{form.enabled
                ? 'Orders search nearby first and widen step by step.'
                : 'Turn on to use the settings below.'}</em>
            </span>
          </label>
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2><Radar size={18} className="zs-head-icon" />Orders</h2>
            <p>An order first looks for providers close to the customer. If nobody accepts, or nobody is in range, the search grows step by step up to the maximum.</p>
          </header>
          <div className="sf-grid sf-grid--2">
            {numberField('start_radius_km')}
            {numberField('step_km')}
            {numberField('step_seconds')}
            {numberField('max_radius_km')}
          </div>

          {plan && (
            <div className="zs-plan" aria-label="Search radius over time">
              <p className="zs-plan-title">What a customer&apos;s order does</p>
              <ol className="zs-steps">
                {plan.out.map((s, i) => (
                  <li key={i}>
                    <span className="zs-step-time">{clock(s.t)}</span>
                    <strong>{s.radius} km</strong>
                  </li>
                ))}
              </ol>
              {!plan.reachesMax && (
                <p className="sf-hint sf-hint--warn">
                  The customer&apos;s search round lasts {clock(SEARCH_ROUND_SECONDS)}, so it ends at {plan.out[plan.out.length - 1].radius} km before reaching {form.max_radius_km} km.
                  Use a larger step or a shorter wait to reach the maximum.
                </p>
              )}
              <p className="sf-hint">
                If nobody is in range at a step, the search moves to the next radius straight away. Tapping
                &ldquo;Keep Trying&rdquo; starts again at {form.start_radius_km} km.
              </p>
            </div>
          )}
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2><Truck size={18} className="zs-head-icon" />Service providers</h2>
            <p>A provider only gets orders within this distance of their live location, even when the order&apos;s search radius is larger. They cannot see or accept orders farther away.</p>
          </header>
          <div className="sf-grid sf-grid--2">
            {numberField('provider_max_travel_km')}
            {numberField('location_max_age_minutes')}
          </div>
          <p className="sf-hint">
            Example: with {form.provider_max_travel_km} km, an order {Math.max(0.5, providerKm - 1)} km away reaches the
            provider; one {providerKm + 1} km away does not. Providers whose app has not sent a location for{' '}
            {form.location_max_age_minutes} minutes are skipped.
          </p>
        </section>

        <div className="sf-actions">
          <button
            type="button"
            className="sf-btn sf-btn--secondary"
            onClick={() => { setForm(toForm(saved)); setFormError(''); setNotice('') }}
            disabled={saving || !dirty}
          >
            Discard changes
          </button>
          <button type="submit" className="sf-btn sf-btn--primary" disabled={saving || !dirty}>
            {saving ? <><Loader2 size={16} className="spin" /> Saving…</> : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ZoneSettings
