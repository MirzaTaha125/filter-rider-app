import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { isGoogleMapsKeyValid } from '../../utils/googleMapsKey'
import './LiveTrackingMap.css'

const PROVIDER_COLOR = '#10b981'
const DESTINATION_COLOR = '#2563eb'

/**
 * Two-point tracking map: where the provider is now, and where the job is.
 *
 * The Maps libraries are kept in a ref rather than read off window.google —
 * under async loading `Marker` ships in the "marker" library and is not
 * guaranteed to be on the global namespace, which silently produces a map with
 * no pins.
 */
function LiveTrackingMap({ apiKey, provider, destination }) {
  const hostRef = useRef(null)
  const mapRef = useRef(null)
  const libsRef = useRef(null)
  const markersRef = useRef({ provider: null, destination: null, line: null })
  const [ready, setReady] = useState(0)
  const [loadError, setLoadError] = useState('')

  const hasValidKey = isGoogleMapsKeyValid(apiKey)

  useEffect(() => {
    if (!hasValidKey || !hostRef.current) return
    let alive = true
    let poll = null

    const init = () => {
      const g = window.google
      if (!g?.maps?.importLibrary) return Promise.reject(new Error('Maps not ready'))
      return Promise.all([g.maps.importLibrary('maps'), g.maps.importLibrary('marker')])
        .then(([mapsLib, markerLib]) => {
          if (!alive || !hostRef.current) return
          libsRef.current = { core: g.maps, mapsLib, markerLib }
          mapRef.current = new mapsLib.Map(hostRef.current, {
            center: destination ?? { lat: 24.7136, lng: 46.6753 },
            zoom: 13,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
          })
          setReady((n) => n + 1)
        })
    }

    const tryInit = () => {
      if (!window.google?.maps?.importLibrary) return false
      init().catch((err) => {
        console.error('Live tracking map failed to initialise:', err)
        if (alive) setLoadError('Map failed to load')
      })
      return true
    }

    if (!tryInit()) {
      const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
      if (existing) {
        poll = setInterval(() => { if (tryInit() && poll) { clearInterval(poll); poll = null } }, 120)
      } else {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey.trim()}&loading=async&libraries=marker&v=beta`
        script.async = true
        script.defer = true
        script.onload = () => { if (alive) setTimeout(tryInit, 150) }
        script.onerror = () => { if (alive) setLoadError('Map failed to load') }
        document.head.appendChild(script)
      }
    }

    return () => {
      alive = false
      if (poll) clearInterval(poll)
      mapRef.current = null
    }
    // Only the key matters for setup; positions are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidKey, apiKey])

  // Position sync — runs on every coordinate change so the provider marker
  // moves with the websocket feed instead of being rebuilt.
  useEffect(() => {
    if (!ready) return
    const map = mapRef.current
    const libs = libsRef.current
    if (!map || !libs) return

    const g = libs.core
    const MarkerCtor = libs.markerLib?.Marker ?? g?.Marker
    if (!MarkerCtor) {
      console.error('Google Maps Marker constructor unavailable — no pins drawn')
      return
    }

    const store = markersRef.current

    const upsert = (key, position, options) => {
      if (!position) {
        store[key]?.setMap(null)
        store[key] = null
        return
      }
      if (store[key]) store[key].setPosition(position)
      else store[key] = new MarkerCtor({ map, position, ...options })
    }

    upsert('destination', destination, {
      title: 'Job location',
      zIndex: 1,
      icon: {
        path: 'M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z',
        fillColor: DESTINATION_COLOR,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 1.5,
        scale: 1.2,
        anchor: new g.Point(12, 24),
      },
    })

    upsert('provider', provider, {
      title: 'Service provider',
      zIndex: 2,
      icon: {
        path: g.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: PROVIDER_COLOR,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
    })

    // A straight line is a hint of distance, not a driving route — the
    // Directions API is not wired up here.
    if (provider && destination) {
      const path = [provider, destination]
      if (store.line) store.line.setPath(path)
      else {
        store.line = new g.Polyline({
          map,
          path,
          strokeColor: PROVIDER_COLOR,
          strokeOpacity: 0.5,
          strokeWeight: 3,
        })
      }
    } else {
      store.line?.setMap(null)
      store.line = null
    }

    const points = [provider, destination].filter(Boolean)
    if (points.length === 2) {
      const bounds = new g.LatLngBounds()
      points.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds, 64)
    } else if (points.length === 1) {
      map.setCenter(points[0])
      map.setZoom(15)
    }
  }, [ready, provider?.lat, provider?.lng, destination?.lat, destination?.lng, provider, destination])

  useEffect(() => () => {
    const store = markersRef.current
    store.provider?.setMap(null)
    store.destination?.setMap(null)
    store.line?.setMap(null)
    markersRef.current = { provider: null, destination: null, line: null }
  }, [])

  if (!hasValidKey || loadError) {
    return (
      <div className="ltm-placeholder">
        <MapPin size={32} />
        <p>{loadError || 'Map not available'}</p>
        <span>
          {loadError
            ? 'Check the browser console for details.'
            : 'Add a valid Google Maps API key in Settings → API Keys.'}
        </span>
      </div>
    )
  }

  return <div ref={hostRef} className="ltm-canvas" />
}

export default LiveTrackingMap
