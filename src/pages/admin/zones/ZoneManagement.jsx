import { useState, useEffect, useRef } from 'react'
import { Plus, MapPin, Edit, Trash2, X, Save, AlertTriangle } from 'lucide-react'
import { getZones, createZone, updateZone, deleteZone, getGoogleMapsKeyFromSettings } from '../../../api'
import { useGoogleMapsApiKey } from '../../../contexts/AppSettingsContext'
import { isGoogleMapsKeyValid } from '../../../utils/googleMapsKey'
import './ZoneManagement.css'

function mapZoneFromApi(item) {
  return {
    id: item.id ?? item._id,
    name: item.zone_name ?? item.name ?? '',
    city: item.city ?? '',
    spCount: item.service_providers_count ?? item.sp_count ?? item.spCount ?? 0,
    isActive: item.is_active ?? item.isActive ?? true,
    lat: item.center_lat ?? item.lat,
    lng: item.center_lng ?? item.lng,
    polygon_json: item.polygon_json,
  }
}

function ZoneManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingZone, setEditingZone] = useState(null)
  const [zones, setZones] = useState([])
  const [zonesLoading, setZonesLoading] = useState(true)
  const [zonesError, setZonesError] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [zoneToDelete, setZoneToDelete] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    spCount: '',
    isActive: true
  })
  const [mapCenter, setMapCenter] = useState({ lat: 24.7136, lng: 46.6753 }) // Default to Riyadh
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  // Google Maps API Key: fetch from GET /admin/settings on this page, then context/env fallback
  const contextMapKey = useGoogleMapsApiKey()
  const [mapApiKey, setMapApiKey] = useState('')
  useEffect(() => {
    getGoogleMapsKeyFromSettings()
      .then((value) => {
        if (value && typeof value === 'string' && value.trim()) setMapApiKey(value.trim())
      })
      .catch(() => {})
  }, [])
  const GOOGLE_MAPS_API_KEY = mapApiKey || contextMapKey

  const openModal = (zone = null) => {
    if (zone) {
      setEditingZone(zone)
      setFormData({
        name: zone.name,
        city: zone.city,
        spCount: (zone.spCount ?? 0).toString(),
        isActive: zone.isActive
      })
      if (zone.lat != null && zone.lng != null) {
        setMapCenter({ lat: zone.lat, lng: zone.lng })
      }
    } else {
      setEditingZone(null)
      setFormData({
        name: '',
        city: '',
        spCount: '',
        isActive: true
      })
      setMapCenter({ lat: 24.7136, lng: 46.6753 })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingZone(null)
    setFormData({
      name: '',
      city: '',
      spCount: '',
      isActive: true
    })
  }

  const fetchZones = async () => {
    setZonesLoading(true)
    setZonesError('')
    try {
      const data = await getZones()
      const list = Array.isArray(data) ? data : (data?.data ?? data?.zones ?? [])
      setZones(list.map(mapZoneFromApi))
    } catch (err) {
      setZonesError(err.message || 'Failed to load zones')
      setZones([])
    } finally {
      setZonesLoading(false)
    }
  }

  useEffect(() => {
    fetchZones()
  }, [])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    setSaveLoading(true)
    try {
      const payload = {
        name: formData.name,
        city: formData.city,
        lat: mapCenter.lat,
        lng: mapCenter.lng,
        isActive: formData.isActive,
      }
      if (editingZone) {
        await updateZone(editingZone.id, payload)
      } else {
        await createZone(payload)
      }
      closeModal()
      fetchZones()
    } catch (err) {
      setZonesError(err.message || 'Failed to save zone')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleDeleteClick = (zone) => {
    setZoneToDelete(zone)
  }

  const handleConfirmDelete = async () => {
    if (!zoneToDelete) return
    try {
      await deleteZone(zoneToDelete.id)
      setZoneToDelete(null)
      fetchZones()
    } catch (err) {
      setZonesError(err.message || 'Failed to delete zone')
    }
    setZoneToDelete(null)
  }

  // Geocode city name to coordinates
  useEffect(() => {
    if (!isModalOpen) return

    // If no city, reset to default location
    if (!formData.city) {
      const defaultCenter = { lat: 24.7136, lng: 46.6753 } // Default to Riyadh
      setMapCenter(defaultCenter)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(defaultCenter)
        if (markerRef.current) {
          markerRef.current.setPosition(defaultCenter)
        }
      }
      return
    }

    const geocodeCity = async () => {
      const g = window.google
      if (!g?.maps?.importLibrary) {
        setTimeout(geocodeCity, 200)
        return
      }
      try {
        const { Geocoder } = await g.maps.importLibrary('geocoding')
        const geocoder = new Geocoder()
        geocoder.geocode({ address: formData.city }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location
          const newCenter = {
            lat: location.lat(),
            lng: location.lng()
          }
          setMapCenter(newCenter)
          
          // Update map if it exists
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(newCenter)
            if (markerRef.current) {
              markerRef.current.position = newCenter
            } else {
              window.google.maps.importLibrary('marker').then(({ AdvancedMarkerElement }) => {
                if (!mapInstanceRef.current) return
                const markerElement = document.createElement('div')
                markerElement.className = 'zone-map-marker'
                markerElement.innerHTML = `<div style="width:32px;height:32px;background:#FCC246;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#1a1a1a"/></svg></div>`
                markerRef.current = new AdvancedMarkerElement({ map: mapInstanceRef.current, position: newCenter, content: markerElement })
              })
            }
          }
        }
      })
      } catch (_) { /* geocoding not ready */ }
    }

    // Debounce geocoding (shorter delay for better UX)
    const timeoutId = setTimeout(geocodeCity, 300)
    return () => clearTimeout(timeoutId)
  }, [formData.city, isModalOpen])

  // Initialize map (use importLibrary for async loader – avoids "Map is not a constructor")
  useEffect(() => {
    if (!isModalOpen) {
      if (markerRef.current) { markerRef.current.map = null; markerRef.current = null }
      mapInstanceRef.current = null
      return
    }

    let isMounted = true
    let pollInterval = null
    if (!isGoogleMapsKeyValid(GOOGLE_MAPS_API_KEY)) return
    const key = GOOGLE_MAPS_API_KEY.trim()

    const initMap = () => {
      const g = window.google
      if (!g?.maps?.importLibrary || !mapRef.current || mapInstanceRef.current) return

      Promise.all([g.maps.importLibrary('maps'), g.maps.importLibrary('marker')])
        .then(([mapsLib, markerLib]) => {
          if (!isMounted || !mapRef.current) return
          const Map = mapsLib.Map
          const AdvancedMarkerElement = markerLib.AdvancedMarkerElement
          if (typeof Map !== 'function') return

          const map = new Map(mapRef.current, {
            center: mapCenter,
            zoom: 12,
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
          })
          mapInstanceRef.current = map

          if (!markerRef.current && AdvancedMarkerElement) {
            const el = document.createElement('div')
            el.className = 'zone-map-marker'
            el.innerHTML = `<div style="width:32px;height:32px;background:#FCC246;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#1a1a1a"/></svg></div>`
            markerRef.current = new AdvancedMarkerElement({ map, position: mapCenter, content: el })
          }
        })
        .catch((err) => console.error('Error initializing zone map:', err))
    }

    if (window.google?.maps?.importLibrary) {
      initMap()
      return () => { isMounted = false }
    }
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
    if (existing) {
      pollInterval = setInterval(() => {
        if (!isMounted) clearInterval(pollInterval)
        else if (window.google?.maps?.importLibrary) {
          clearInterval(pollInterval)
          initMap()
        }
      }, 100)
      return () => { isMounted = false; if (pollInterval) clearInterval(pollInterval) }
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&libraries=marker,geocoding&v=beta`
    script.async = true
    script.defer = true
    script.onload = () => { if (isMounted) setTimeout(initMap, 150) }
    script.onerror = () => console.error('Failed to load Google Maps script')
    document.head.appendChild(script)

    return () => { isMounted = false }
  }, [isModalOpen, formData.city, GOOGLE_MAPS_API_KEY, mapCenter.lat, mapCenter.lng])

  return (
    <div className="zone-management">
      <div className="zone-header">
        <div className="zone-header-content">
          <div>
            <h1 className="zone-title">Geographic & Zone Management</h1>
            <p className="zone-subtitle">Configure service zones and regional settings</p>
          </div>
          <button className="btn-add-zone" onClick={() => openModal()}>
            <Plus size={18} />
            <span>Add Zone</span>
          </button>
        </div>
      </div>

      {zonesError && (
        <div className="zone-error">{zonesError}</div>
      )}
      <div className="zones-grid">
        {zonesLoading ? (
          <div className="zone-loading">Loading zones…</div>
        ) : zones.length === 0 ? (
          <div className="zone-empty">No zones yet. Add a zone to get started.</div>
        ) : (
          zones.map((zone) => (
            <div key={zone.id} className="zone-card">
              <div className="zone-icon">
                <MapPin size={24} />
              </div>
              <div className="zone-info">
                <h3 className="zone-name">{zone.name}</h3>
                <p className="zone-city">{zone.city}</p>
                <div className="zone-stats">
                  <span>{zone.spCount} Service Providers</span>
                  <span className={`zone-status ${zone.isActive ? 'active' : 'inactive'}`}>
                    {zone.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="zone-actions">
                <button className="btn-edit" onClick={() => openModal(zone)}>
                  <Edit size={16} />
                </button>
                <button className="btn-delete" onClick={() => handleDeleteClick(zone)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Zone Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content zone-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">
                  {editingZone ? 'Edit Zone' : 'Add New Zone'}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="zone-form">
                <div className="form-group">
                  <label htmlFor="zone-name">Zone Name</label>
                  <input
                    type="text"
                    id="zone-name"
                    className="form-input"
                    placeholder="e.g. Riyadh Central"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="zone-city">City</label>
                  <input
                    type="text"
                    id="zone-city"
                    className="form-input"
                    placeholder="e.g. Riyadh"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                  <div className="zone-map-container">
                    <div ref={mapRef} className="zone-map" />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="sp-count">Service Providers Count</label>
                  <input
                    type="number"
                    id="sp-count"
                    className="form-input"
                    placeholder="0"
                    min="0"
                    value={formData.spCount}
                    onChange={(e) => handleInputChange('spCount', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    />
                    <span>Active Zone</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal} disabled={saveLoading}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saveLoading}>
                <Save size={18} />
                {saveLoading ? 'Saving…' : (editingZone ? 'Update Zone' : 'Add Zone')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete zone confirm modal */}
      {zoneToDelete && (
        <div className="zone-dialog-overlay" onClick={() => setZoneToDelete(null)}>
          <div className="zone-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="zone-dialog__icon zone-dialog__icon--warning">
              <AlertTriangle size={28} />
            </div>
            <h3 className="zone-dialog__title">Delete this zone?</h3>
            <p className="zone-dialog__text">
              “{zoneToDelete.name}” will be removed. This cannot be undone.
            </p>
            <div className="zone-dialog__actions">
              <button type="button" className="zone-dialog__btn zone-dialog__btn--secondary" onClick={() => setZoneToDelete(null)}>
                Keep
              </button>
              <button type="button" className="zone-dialog__btn zone-dialog__btn--danger" onClick={handleConfirmDelete}>
                Delete zone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ZoneManagement

