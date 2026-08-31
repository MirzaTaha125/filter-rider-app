import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, MapPin } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getZone, createZone, updateZone, getGoogleMapsKeyFromSettings,
} from '../../../api'
import { useGoogleMapsApiKey } from '../../../contexts/AppSettingsContext'
import { isGoogleMapsKeyValid } from '../../../utils/googleMapsKey'
import '../adminForm.css'
import './ZoneForm.css'

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 } // Riyadh

const MARKER_HTML = `
  <div style="width:30px;height:30px;background:#F0B020;border:3px solid white;border-radius:50%;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:grab">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#1a1a1a"/>
    </svg>
  </div>`

function ZoneForm() {
  const { zoneId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(zoneId)

  const [form, setForm] = useState({ name: '', city: '', isActive: true })
  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [providerCount, setProviderCount] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

  const mapNodeRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const centerRef = useRef(center)
  centerRef.current = center

  // Map key: page-level settings first, then app context.
  const contextKey = useGoogleMapsApiKey()
  const [settingsKey, setSettingsKey] = useState('')
  useEffect(() => {
    getGoogleMapsKeyFromSettings()
      .then(v => { if (typeof v === 'string' && v.trim()) setSettingsKey(v.trim()) })
      .catch(() => {})
  }, [])
  const mapsKey = settingsKey || contextKey
  const mapsUsable = isGoogleMapsKeyValid(mapsKey)

  const load = useCallback(async () => {
    if (!isEdit) return
    setLoading(true)
    setLoadError('')
    try {
      const zone = await getZone(zoneId)
      if (!zone?.id) {
        setLoadError('Zone not found')
        return
      }
      setForm({
        name: zone.zone_name ?? '',
        city: zone.city ?? '',
        isActive: zone.is_active !== false,
      })
      setProviderCount(zone.service_providers_count ?? 0)
      if (zone.center_lat != null && zone.center_lng != null) {
        setCenter({ lat: Number(zone.center_lat), lng: Number(zone.center_lng) })
      }
    } catch (err) {
      setLoadError(err.message || 'Failed to load zone')
    } finally {
      setLoading(false)
    }
  }, [zoneId, isEdit])

  useEffect(() => { load() }, [load])

  /* ---------------- Map ---------------- */

  // Load the Maps script once, then build the map. Deliberately does not depend
  // on `center` — re-running this would tear the map down on every pan.
  useEffect(() => {
    if (loading || !mapsUsable) return
    let alive = true
    let poll = null

    const build = async () => {
      const g = window.google
      if (!g?.maps?.importLibrary || !mapNodeRef.current || mapRef.current) return
      try {
        const [maps, markerLib] = await Promise.all([
          g.maps.importLibrary('maps'),
          g.maps.importLibrary('marker'),
        ])
        if (!alive || !mapNodeRef.current || mapRef.current) return

        const map = new maps.Map(mapNodeRef.current, {
          center: centerRef.current,
          zoom: 12,
          mapId: 'DEMO_MAP_ID',
          streetViewControl: false,
          mapTypeControl: false,
        })
        mapRef.current = map

        const el = document.createElement('div')
        el.innerHTML = MARKER_HTML
        const marker = new markerLib.AdvancedMarkerElement({
          map,
          position: centerRef.current,
          content: el,
          gmpDraggable: true,
        })
        // Dragging the pin is the only way to set a precise centre — geocoding
        // the city alone only ever lands on the city centre.
        marker.addListener('dragend', (e) => {
          const pos = e.latLng ?? marker.position
          if (!pos) return
          const next = {
            lat: typeof pos.lat === 'function' ? pos.lat() : pos.lat,
            lng: typeof pos.lng === 'function' ? pos.lng() : pos.lng,
          }
          setCenter(next)
        })
        markerRef.current = marker
      } catch (err) {
        console.error('Zone map failed to initialise:', err)
      }
    }

    if (window.google?.maps?.importLibrary) {
      build()
    } else if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      poll = setInterval(() => {
        if (window.google?.maps?.importLibrary) { clearInterval(poll); build() }
      }, 100)
    } else {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey.trim()}&loading=async&libraries=marker,geocoding&v=beta`
      script.async = true
      script.defer = true
      script.onload = () => { if (alive) build() }
      document.head.appendChild(script)
    }

    return () => {
      alive = false
      if (poll) clearInterval(poll)
      if (markerRef.current) { markerRef.current.map = null; markerRef.current = null }
      mapRef.current = null
    }
  }, [loading, mapsUsable, mapsKey])

  // Keep the map in sync when the centre changes from geocoding or load.
  useEffect(() => {
    if (mapRef.current) mapRef.current.setCenter(center)
    if (markerRef.current) markerRef.current.position = center
  }, [center])

  // Geocode the typed city, debounced.
  useEffect(() => {
    const city = form.city.trim()
    if (!city || !mapsUsable) return

    const timer = setTimeout(async () => {
      const g = window.google
      if (!g?.maps?.importLibrary) return
      try {
        const { Geocoder } = await g.maps.importLibrary('geocoding')
        new Geocoder().geocode({ address: city }, (results, status) => {
          if (status !== 'OK' || !results?.[0]) return
          const loc = results[0].geometry.location
          setCenter({ lat: loc.lat(), lng: loc.lng() })
        })
      } catch {
        /* geocoding unavailable */
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [form.city, mapsUsable])

  /* ---------------- Form ---------------- */

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Zone name is required.'); return }
    if (!form.city.trim()) { setFormError('City is required.'); return }

    setSaving(true)
    setFormError('')
    const payload = {
      name: form.name.trim(),
      city: form.city.trim(),
      lat: center.lat,
      lng: center.lng,
      isActive: form.isActive,
    }

    try {
      if (isEdit) {
        await updateZone(zoneId, payload)
      } else {
        await createZone(payload)
      }
      navigate('/admin/zones')
    } catch (err) {
      setFormError(err.message || 'Failed to save zone')
      setSaving(false)
    }
  }

  const title = isEdit ? 'Edit Zone' : 'Add Zone'

  if (loading) {
    return (
      <div className="zone-form-page">
        <PageHeader title={title} />
        <div className="sf-state"><Loader2 size={32} className="spin" /><span>Loading…</span></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="zone-form-page">
        <PageHeader title={title} />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load zone</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate('/admin/zones')}>
            Back to zones
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="zone-form-page">
      <PageHeader
        title={title}
        subtitle={isEdit ? form.name : 'Define a service area and its centre point'}
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
            <h2>Zone details</h2>
            <p>Typing a city moves the map; drag the pin to fine-tune the centre.</p>
          </header>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="name">Zone name <span className="sf-req">*</span></label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Riyadh Central"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="sf-field">
              <label htmlFor="city">City <span className="sf-req">*</span></label>
              <input
                id="city"
                type="text"
                placeholder="e.g. Riyadh"
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="sf-field">
            <label>Centre point</label>
            {mapsUsable ? (
              <div className="zf-map-wrap">
                <div ref={mapNodeRef} className="zf-map" />
              </div>
            ) : (
              <div className="zf-map-missing">
                <MapPin size={22} />
                <p>
                  No Google Maps key configured, so the map is unavailable.
                  The zone will be saved at the coordinates below.
                </p>
              </div>
            )}
            <span className="zf-coords">
              <MapPin size={13} />
              {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
            </span>
          </div>

          {isEdit && providerCount !== null && (
            <div className="zf-readonly">
              <span className="zf-readonly-label">Service providers in this zone</span>
              <span className="zf-readonly-value">{providerCount}</span>
              <span className="zf-readonly-hint">
                Calculated from assigned providers — refresh it from the zones list.
              </span>
            </div>
          )}
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Status</h2>
            <p>Inactive zones stay on record but are not offered for new bookings.</p>
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
              <em>Customers in this zone can book services.</em>
            </span>
          </label>
        </section>

        <div className="sf-actions">
          <button
            type="button"
            className="sf-btn sf-btn--secondary"
            onClick={() => navigate('/admin/zones')}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="sf-btn sf-btn--primary" disabled={saving}>
            {saving
              ? <><Loader2 size={16} className="spin" /> Saving…</>
              : isEdit ? 'Save changes' : 'Create zone'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ZoneForm
