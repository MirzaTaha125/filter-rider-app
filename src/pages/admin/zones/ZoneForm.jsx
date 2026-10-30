import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, MapPin } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getZone, createZone, updateZone, getGoogleMapsKeyFromSettings,
} from '../../../api'
import { useGoogleMapsApiKey } from '../../../contexts/AppSettingsContext'
import { isGoogleMapsKeyValid } from '../../../utils/googleMapsKey'
import { CityPicker, AreaPicker } from './ZonePlacePickers'
import '../adminForm.css'
import './ZoneForm.css'
import { PageShimmer } from '../../../components/Shimmer/Shimmer'


const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 } // Riyadh
const DEFAULT_RADIUS_KM = '3'

const MARKER_HTML = `
  <div style="width:30px;height:30px;background:#FCC245;border:3px solid white;border-radius:50%;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:grab">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#1a1a1a"/>
    </svg>
  </div>`

const AREA_PIN_HTML = `
  <div style="width:14px;height:14px;background:#FCC245;border:2px solid #1a1a1a;border-radius:50%;
    box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`

/** Average of the area centres: the zone's centre point. */
function centreOf(areas) {
  if (!areas.length) return null
  const lat = areas.reduce((sum, a) => sum + Number(a.lat), 0) / areas.length
  const lng = areas.reduce((sum, a) => sum + Number(a.lng), 0) / areas.length
  return { lat, lng }
}

function parseRadius(value) {
  const n = Number(value)
  return value !== '' && Number.isFinite(n) && n >= 0.1 && n <= 100 ? n : null
}

function clearOverlays(list) {
  list.forEach(o => {
    if (typeof o.setMap === 'function') o.setMap(null)
    else o.map = null
  })
}

function ZoneForm() {
  const { zoneId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(zoneId)

  const [form, setForm] = useState({ name: '', city: '', isActive: true })
  // Google city ({ place_id, name, lat, lng }). `form.city` keeps the name of
  // older zones that were saved before cities came from Google.
  const [city, setCity] = useState(null)
  const [areas, setAreas] = useState([])
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM)
  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [mapReady, setMapReady] = useState(false)
  const [providerCount, setProviderCount] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

  const mapNodeRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const overlaysRef = useRef([])
  const libsRef = useRef(null)
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
      const savedCentre = zone.center_lat != null && zone.center_lng != null
        ? { lat: Number(zone.center_lat), lng: Number(zone.center_lng) }
        : null
      if (savedCentre) setCenter(savedCentre)
      if (zone.city_place_id) {
        setCity({
          place_id: zone.city_place_id,
          name: zone.city ?? '',
          lat: savedCentre?.lat ?? DEFAULT_CENTER.lat,
          lng: savedCentre?.lng ?? DEFAULT_CENTER.lng,
        })
      }
      setAreas(Array.isArray(zone.areas_json) ? zone.areas_json : [])
      if (zone.radius_km != null) setRadiusKm(String(Number(zone.radius_km)))
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
        libsRef.current = { maps, markerLib }

        const el = document.createElement('div')
        el.innerHTML = MARKER_HTML
        const marker = new markerLib.AdvancedMarkerElement({
          map,
          position: centerRef.current,
          content: el,
          gmpDraggable: true,
        })
        // Without areas (older zones), dragging the pin sets the centre.
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
        setMapReady(true)
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
      clearOverlays(overlaysRef.current)
      overlaysRef.current = []
      libsRef.current = null
      mapRef.current = null
      setMapReady(false)
    }
  }, [loading, mapsUsable, mapsKey])

  // With areas picked, the centre is their average; otherwise the city centre.
  useEffect(() => {
    const c = centreOf(areas)
    if (c) setCenter(c)
    else if (city) setCenter({ lat: city.lat, lng: city.lng })
  }, [areas, city])

  // The centre pin is only shown (and draggable) when no areas are picked.
  useEffect(() => {
    if (!mapReady) return
    if (markerRef.current) {
      markerRef.current.position = center
      markerRef.current.map = areas.length ? null : mapRef.current
    }
    if (mapRef.current && !areas.length) mapRef.current.setCenter(center)
  }, [center, areas.length, mapReady])

  // Draw each area with its radius and fit the map to all of them.
  const radiusValue = parseRadius(radiusKm)
  useEffect(() => {
    const map = mapRef.current
    const libs = libsRef.current
    if (!mapReady || !map || !libs) return

    clearOverlays(overlaysRef.current)
    overlaysRef.current = []
    if (!areas.length) return

    const bounds = new window.google.maps.LatLngBounds()
    for (const area of areas) {
      const position = { lat: Number(area.lat), lng: Number(area.lng) }
      const el = document.createElement('div')
      el.innerHTML = AREA_PIN_HTML
      overlaysRef.current.push(new libs.markerLib.AdvancedMarkerElement({
        map, position, content: el, title: area.name,
      }))
      if (radiusValue) {
        const circle = new libs.maps.Circle({
          map,
          center: position,
          radius: radiusValue * 1000,
          strokeColor: '#E0A21B',
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: '#FCC245',
          fillOpacity: 0.18,
          clickable: false,
        })
        overlaysRef.current.push(circle)
        bounds.union(circle.getBounds())
      } else {
        bounds.extend(position)
      }
    }
    map.fitBounds(bounds, 32)
  }, [areas, radiusValue, mapReady])

  /* ---------------- Form ---------------- */

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const cityName = (city?.name || form.city).trim()
    if (!form.name.trim()) { setFormError('Zone name is required.'); return }
    if (!cityName) { setFormError('Select a city.'); return }
    // New zones need areas; older zones (no Google city yet) can still be saved as they were.
    if (!areas.length && (!isEdit || city?.place_id)) {
      setFormError('Select at least one area.')
      return
    }
    if (areas.length && radiusValue === null) {
      setFormError('Radius must be between 0.1 and 100 km.')
      return
    }

    setSaving(true)
    setFormError('')
    const payload = {
      name: form.name.trim(),
      city: cityName,
      lat: center.lat,
      lng: center.lng,
      isActive: form.isActive,
      ...(city?.place_id && { cityPlaceId: city.place_id }),
      ...(areas.length > 0 && { areas, radiusKm: radiusValue }),
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
        <PageShimmer />
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
        subtitle={isEdit ? form.name : 'Pick a city, its areas and a radius'}
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
            <p>Cities and areas come from Google. Each area is covered up to the radius you set.</p>
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
              <label>City <span className="sf-req">*</span></label>
              <CityPicker
                value={city}
                fallbackName={form.city}
                onChange={(next) => {
                  if (next.place_id !== city?.place_id) setAreas([])
                  setCity(next)
                  setFormError('')
                }}
                disabled={saving}
              />
              {isEdit && !city && form.city && (
                <span className="sf-hint">
                  Saved before cities came from Google. Pick the city again to choose areas.
                </span>
              )}
            </div>
          </div>

          <div className="sf-field">
            <label>Areas <span className="sf-req">*</span></label>
            <AreaPicker
              cityPlaceId={city?.place_id}
              selected={areas}
              onChange={(next) => { setAreas(next); setFormError('') }}
              disabled={saving}
            />
          </div>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="radius">Radius around each area (km) <span className="sf-req">*</span></label>
              <input
                id="radius"
                type="number"
                min="0.1"
                max="100"
                step="0.5"
                inputMode="decimal"
                value={radiusKm}
                onChange={(e) => { setRadiusKm(e.target.value); setFormError('') }}
                disabled={saving}
              />
              {radiusKm !== '' && radiusValue === null && (
                <span className="sf-hint sf-hint--warn">Use a value between 0.1 and 100 km.</span>
              )}
            </div>
          </div>

          <div className="sf-field">
            <label>Coverage on the map</label>
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
              Centre {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
              {areas.length > 0
                ? ` · ${areas.length} area${areas.length === 1 ? '' : 's'}${radiusValue ? ` · ${radiusValue} km each` : ''}`
                : ' · drag the pin to adjust'}
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
