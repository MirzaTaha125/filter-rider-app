import { useState, useMemo, useEffect, useRef } from 'react'
import {
  ShoppingCart, TrendingUp,
  Users,
  AlertCircle, MapPin,
  ChevronDown
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getGoogleMapsKeyFromSettings, getAdminOrders, getProviders } from '../../../api'
import { useGoogleMapsApiKey } from '../../../contexts/AppSettingsContext'
import { isGoogleMapsKeyValid } from '../../../utils/googleMapsKey'
import './Dashboard.css'

// Google Maps
function GoogleMapsAdvanced({ apiKey, center }) {
  const mapRef = useRef(null)
  const hasValidKey = isGoogleMapsKeyValid(apiKey)

  useEffect(() => {
    if (!hasValidKey || !mapRef.current) return
    let isMounted = true
    let pollInterval = null
    const apiKeyClean = apiKey.trim()

    const loadAndInit = () => {
      const g = window.google
      if (!g?.maps?.importLibrary) return Promise.reject(new Error('Google Maps not ready'))
      return Promise.all([g.maps.importLibrary('maps'), g.maps.importLibrary('marker')])
        .then(([mapsLib]) => {
          if (!isMounted || !mapRef.current) return
          const Map = mapsLib.Map
          if (!Map || typeof Map !== 'function') throw new Error('Map is not a constructor')
          new Map(mapRef.current, {
            center,
            zoom: 12,
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
          })
        })
    }

    const run = () => {
      const tryInit = () => {
        if (window.google?.maps?.importLibrary) {
          loadAndInit().catch((err) => console.error('Error initializing map:', err))
          return true
        }
        return false
      }
      if (tryInit()) return
      const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
      if (existing) {
        pollInterval = setInterval(() => {
          if (!isMounted && pollInterval) clearInterval(pollInterval)
          else if (tryInit() && pollInterval) { clearInterval(pollInterval); pollInterval = null }
        }, 100)
        return
      }
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKeyClean}&loading=async&libraries=marker&v=beta`
      script.async = true
      script.defer = true
      script.onload = () => {
        if (isMounted) setTimeout(() => loadAndInit().catch((err) => console.error('Error initializing map:', err)), 150)
      }
      script.onerror = () => console.error('Failed to load Google Maps script')
      document.head.appendChild(script)
    }
    run()
    return () => {
      isMounted = false
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [hasValidKey, apiKey, center?.lat, center?.lng])

  if (!hasValidKey) return null
  return <div ref={mapRef} className="map-visualization" />
}

function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('7days')
  const [orderStats, setOrderStats] = useState({ total: null, active: null, pending: null })
  const [spStats, setSpStats] = useState({ total: null, online: null, busy: null, offline: null })
  const [statsLoading, setStatsLoading] = useState(true)

  const contextMapKey = useGoogleMapsApiKey()
  const [mapApiKey, setMapApiKey] = useState('')

  // Riyadh as default map center
  const mapCenter = useMemo(() => ({ lat: 24.7136, lng: 46.6753 }), [])

  useEffect(() => {
    getGoogleMapsKeyFromSettings()
      .then((value) => { if (value?.trim()) setMapApiKey(value.trim()) })
      .catch(() => {})

    Promise.all([
      getAdminOrders({}).catch(() => null),
      getProviders({ limit: 100 }).catch(() => null),
    ]).then(([ordersData, providersData]) => {
      // Orders
      const orderList = Array.isArray(ordersData) ? ordersData : (ordersData?.items ?? ordersData?.orders ?? [])
      const totalOrders = ordersData?.total ?? orderList.length
      const activeOrders = orderList.filter(o =>
        ['ACCEPTED', 'IN_PROGRESS', 'ON_THE_WAY', 'ARRIVED', 'accepted', 'in_progress', 'on_the_way', 'arrived'].includes(o.status)
      ).length
      const pendingOrders = orderList.filter(o =>
        ['PENDING', 'CREATED', 'BROADCASTING', 'pending', 'created', 'broadcasting'].includes(o.status)
      ).length
      setOrderStats({ total: totalOrders, active: activeOrders, pending: pendingOrders })

      // Service Providers
      const spList = Array.isArray(providersData) ? providersData
        : (providersData?.providers ?? providersData?.items ?? providersData?.data ?? [])
      const totalSP = providersData?.total ?? spList.length
      const onlineCount = spList.filter(sp =>
        ['ONLINE', 'online', 'AVAILABLE', 'available'].includes(sp.availability ?? sp.status)
      ).length
      const busyCount = spList.filter(sp =>
        ['BUSY', 'busy', 'ON_TASK', 'on_task'].includes(sp.availability ?? sp.status)
      ).length
      const offlineCount = spList.filter(sp =>
        ['OFFLINE', 'offline', 'INACTIVE', 'inactive'].includes(sp.availability ?? sp.status)
      ).length
      setSpStats({ total: totalSP || null, online: onlineCount, busy: busyCount, offline: offlineCount })
    }).finally(() => setStatsLoading(false))
  }, [])

  const GOOGLE_MAPS_API_KEY = mapApiKey || contextMapKey

  const totalSPs = spStats.total ?? ((spStats.online + spStats.busy + spStats.offline) || 0)
  const spStatusData = {
    busy:    { count: spStats.busy ?? 0,    percentage: totalSPs ? Math.round((spStats.busy ?? 0)    / totalSPs * 100) : 0, color: '#FCC246' },
    online:  { count: spStats.online ?? 0,  percentage: totalSPs ? Math.round((spStats.online ?? 0)  / totalSPs * 100) : 0, color: '#10b981' },
    offline: { count: spStats.offline ?? 0, percentage: totalSPs ? Math.round((spStats.offline ?? 0) / totalSPs * 100) : 0, color: '#6b7280' },
  }

  // Revenue chart — no API available yet, show empty placeholder
  const revenueTrendsData = useMemo(() => {
    const today = new Date()
    if (selectedPeriod === '7days') {
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
        return { day: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(), value: 0, date }
      })
    }
    if (selectedPeriod === '30days') {
      return Array.from({ length: 30 }, (_, i) => {
        const date = new Date(today.getTime() - (29 - i) * 24 * 60 * 60 * 1000)
        return { day: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(), value: 0, date }
      })
    }
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1)
      return { day: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(), value: 0, date }
    })
  }, [selectedPeriod])

  return (
    <div className="dashboard">
      {/* Top Row - KPI Cards */}
      <div className="dashboard-top-row">
        <div className="kpi-card">
          <div className="kpi-icon-wrapper orders">
            <ShoppingCart size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Total Orders</div>
            <div className="kpi-value">
              {statsLoading ? '—' : (orderStats.total ?? 0).toLocaleString()}
            </div>
            <div className="kpi-trend positive">
              <TrendingUp size={14} />
              <span>Active: {orderStats.active ?? 0} · Pending: {orderStats.pending ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper sps">
            <Users size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Service Providers</div>
            <div className="kpi-value">
              {statsLoading ? '—' : totalSPs.toLocaleString()}
            </div>
            <div className="kpi-trend yellow">
              <TrendingUp size={14} />
              <span>Online: {spStats.online ?? 0} · Busy: {spStats.busy ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="dashboard-map-section">
        <div className="map-card">
          <div className="map-header">
            <div className="map-title-section">
              <AlertCircle size={20} className="map-title-icon" />
              <h3 className="map-title">Real-time Operations Map</h3>
            </div>
            <div className="map-legend">
              <div className="legend-item"><div className="legend-dot online"></div><span>Online</span></div>
              <div className="legend-item"><div className="legend-dot busy"></div><span>Busy</span></div>
              <div className="legend-item"><div className="legend-dot offline"></div><span>Offline</span></div>
            </div>
          </div>

          <div className="map-container">
            {isGoogleMapsKeyValid(GOOGLE_MAPS_API_KEY) ? (
              <GoogleMapsAdvanced apiKey={GOOGLE_MAPS_API_KEY} center={mapCenter} />
            ) : (
              <div className="map-placeholder">
                <MapPin size={48} />
                <p className="map-placeholder-title">Map not available</p>
                <p className="map-placeholder-text">
                  Add a valid <strong>Google Maps API key</strong> in <strong>Settings → API Keys</strong>.
                  You must enable <strong>Maps JavaScript API</strong> for your key in Google Cloud Console.
                </p>
                <a
                  className="map-placeholder-link"
                  href="https://console.cloud.google.com/apis/library/maps-javascript-backend.googleapis.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Enable Maps JavaScript API →
                </a>
              </div>
            )}

            <div className="live-activity-box">
              <div className="live-activity-header">LIVE ACTIVITY</div>
              <div className="live-activity-item">
                <span className="live-activity-label">Active Orders:</span>
                <span className="live-activity-value blue">{orderStats.active ?? '—'}</span>
              </div>
              <div className="live-activity-item">
                <span className="live-activity-label">Pending Orders:</span>
                <span className="live-activity-value orange">{orderStats.pending ?? '—'}</span>
              </div>
              {(orderStats.active > 0 || orderStats.pending > 0) && (
                <div className="live-activity-progress">
                  <div className="live-activity-progress-bar">
                    <div
                      className="live-activity-progress-fill"
                      style={{ width: `${orderStats.active + orderStats.pending > 0 ? (orderStats.pending / (orderStats.active + orderStats.pending)) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="dashboard-bottom-row">
        {/* Revenue Trends */}
        <div className="trends-card">
          <div className="trends-header">
            <h3 className="trends-title">Revenue Trends</h3>
            <div className="trends-dropdown">
              <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="period-select">
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
              </select>
              <ChevronDown size={16} className="dropdown-icon" />
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueTrendsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={false} tickFormatter={(v) => `\u20C1${v.toLocaleString()}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 12px' }}
                  formatter={(v) => [`\u20C1${v.toLocaleString()}`, 'Revenue']}
                  labelStyle={{ color: '#1a1a1a', fontWeight: 600, marginBottom: '4px' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {revenueTrendsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === revenueTrendsData.length - 1 ? '#fdb714' : '#FCC246'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SP Status */}
        <div className="sp-status-card">
          <div className="sp-status-header">
            <h3 className="sp-status-title">Service Provider Status</h3>
            <span className="live-badge">LIVE</span>
          </div>

          <div className="sp-status-content">
            <div className="donut-chart-wrapper">
              <div className="donut-chart">
                <svg viewBox="0 0 120 120" className="donut-svg">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                  {totalSPs > 0 && <>
                    <circle cx="60" cy="60" r="50" fill="none" stroke={spStatusData.busy.color} strokeWidth="12"
                      strokeDasharray={`${(spStatusData.busy.percentage / 100) * 314.16} ${314.16}`}
                      strokeDashoffset="0" transform="rotate(-90 60 60)" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke={spStatusData.online.color} strokeWidth="12"
                      strokeDasharray={`${(spStatusData.online.percentage / 100) * 314.16} ${314.16}`}
                      strokeDashoffset={`-${(spStatusData.busy.percentage / 100) * 314.16}`}
                      transform="rotate(-90 60 60)" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke={spStatusData.offline.color} strokeWidth="12"
                      strokeDasharray={`${(spStatusData.offline.percentage / 100) * 314.16} ${314.16}`}
                      strokeDashoffset={`-${((spStatusData.busy.percentage + spStatusData.online.percentage) / 100) * 314.16}`}
                      transform="rotate(-90 60 60)" />
                  </>}
                </svg>
                <div className="donut-center">
                  <div className="donut-total">{statsLoading ? '—' : totalSPs}</div>
                  <div className="donut-label">TOTAL SPS</div>
                </div>
              </div>
            </div>

            <div className="sp-status-breakdown">
              <div className="breakdown-item">
                <div className="breakdown-dot" style={{ backgroundColor: spStatusData.busy.color }}></div>
                <div className="breakdown-content">
                  <div className="breakdown-label">Busy (On-task)</div>
                  <div className="breakdown-value">{spStatusData.busy.count} Providers ({spStatusData.busy.percentage}%)</div>
                </div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-dot" style={{ backgroundColor: spStatusData.online.color }}></div>
                <div className="breakdown-content">
                  <div className="breakdown-label">Online (Available)</div>
                  <div className="breakdown-value">{spStatusData.online.count} Providers ({spStatusData.online.percentage}%)</div>
                </div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-dot" style={{ backgroundColor: spStatusData.offline.color }}></div>
                <div className="breakdown-content">
                  <div className="breakdown-label">Offline</div>
                  <div className="breakdown-value">{spStatusData.offline.count} Providers ({spStatusData.offline.percentage}%)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
