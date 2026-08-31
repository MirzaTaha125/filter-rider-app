import { useState, useMemo, useEffect, useRef } from 'react'
import {
  ShoppingCart, TrendingUp,
  Users, DollarSign, Percent,
  AlertCircle, MapPin,
  ChevronDown, ShieldAlert, CheckCircle2, XCircle,
  Wrench, UserRound, Lock
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  getGoogleMapsKeyFromSettings, getAdminOrders, getProviders, getWalletOverview,
  getDisputes, getServices, getCustomers, getZones,
} from '../../../api'
import { useGoogleMapsApiKey } from '../../../contexts/AppSettingsContext'
import { usePermissions } from '../../../contexts/PermissionsContext'
import {
  countOrderStatuses, countProviderPresence, normalizeStatus, isOpen,
} from '../orders/orderStatus'
import { isGoogleMapsKeyValid } from '../../../utils/googleMapsKey'
import './Dashboard.css'

/** Response shapes vary per endpoint; pull out whichever array is present. */
function toList(data, ...keys) {
  if (Array.isArray(data)) return data
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key]
  }
  return []
}

const PRESENCE_COLORS = { ONLINE: '#10b981', BUSY: '#f0b020', OFFLINE: '#6b7280' }
const ORDER_PIN_COLOR = '#2563eb'

/** Providers we plot: idle/offline staff are noise on an operations map. */
function toMappableProviders(providers) {
  return providers
    .map((p) => {
      const lat = Number(p.location?.latitude ?? p.latitude)
      const lng = Number(p.location?.longitude ?? p.longitude)
      const availability = String(p.availability ?? p.status ?? 'OFFLINE').toUpperCase()
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      if (availability !== 'ONLINE' && availability !== 'BUSY') return null
      return {
        id: p.id,
        lat,
        lng,
        availability,
        name: p.full_name ?? p.name ?? 'Provider',
        phone: p.phone ?? null,
        city: p.location?.city ?? null,
        updatedAt: p.location?.updated_at ?? p.last_seen_at ?? null,
      }
    })
    .filter(Boolean)
}

function toMappableOrders(orders) {
  return orders
    .map((o) => {
      const lat = Number(o.latitude)
      const lng = Number(o.longitude)
      const status = normalizeStatus(o.status)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      if (!isOpen(o)) return null
      return {
        id: o.id,
        lat,
        lng,
        status,
        orderNo: o.order_no ?? `#${String(o.id).slice(0, 8)}`,
        service: o.service?.name_en ?? o.service?.name ?? '—',
        customer: o.customer?.user?.full_name ?? o.customer?.full_name ?? null,
        provider: o.provider?.user?.full_name ?? o.provider?.full_name ?? null,
        address: o.address_text ?? null,
        total: o.total_price,
        currency: o.currency ?? 'SAR',
        scheduledAt: o.scheduled_at ?? null,
      }
    })
    .filter(Boolean)
}

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))

function orderTooltip(order) {
  const rows = [
    ['Service', order.service],
    ['Status', order.status.replace(/_/g, ' ')],
    ['Customer', order.customer],
    ['Provider', order.provider ?? 'Unassigned'],
    ['Address', order.address],
    ['Total', order.total != null ? `${order.currency} ${Number(order.total).toFixed(2)}` : null],
  ].filter(([, value]) => value)

  return `
    <div class="map-tip">
      <div class="map-tip-title">${escapeHtml(order.orderNo)}</div>
      ${rows.map(([label, value]) => `
        <div class="map-tip-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>`).join('')}
    </div>`
}

function providerTooltip(provider) {
  const rows = [
    ['Status', provider.availability],
    ['Phone', provider.phone],
    ['City', provider.city],
  ].filter(([, value]) => value)

  return `
    <div class="map-tip">
      <div class="map-tip-title">${escapeHtml(provider.name)}</div>
      ${rows.map(([label, value]) => `
        <div class="map-tip-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>`).join('')}
    </div>`
}

// Google Maps
function GoogleMapsAdvanced({ apiKey, center, mapProviders = [], mapOrders = [] }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const infoRef = useRef(null)
  // Holds the resolved Maps libraries. Reading google.maps.Marker off the
  // global namespace is unreliable under async loading — Marker ships in the
  // "marker" library, so we keep what importLibrary actually handed back.
  const libsRef = useRef(null)
  const [mapReady, setMapReady] = useState(0)
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
        .then(([mapsLib, markerLib]) => {
          if (!isMounted || !mapRef.current) return
          const Map = mapsLib.Map
          if (!Map || typeof Map !== 'function') throw new Error('Map is not a constructor')
          libsRef.current = { mapsLib, markerLib, core: g.maps }
          mapInstance.current = new Map(mapRef.current, {
            center,
            zoom: 12,
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
          })
          // Signals the marker effect that the map and libraries are ready.
          setMapReady((n) => n + 1)
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
      mapInstance.current = null
    }
  }, [hasValidKey, apiKey, center?.lat, center?.lng])

  // Markers are redrawn whenever the data changes. Classic google.maps.Marker
  // is used rather than AdvancedMarkerElement because the latter silently
  // renders nothing unless the map is created with a Map ID, and a Map ID also
  // disables the inline `styles` this map relies on.
  useEffect(() => {
    if (!hasValidKey || !mapReady) return

    const map = mapInstance.current
    const libs = libsRef.current
    if (!map || !libs) return

    // Marker lives in the "marker" library; InfoWindow and the geometry
    // helpers come from core. Falling back to the namespace keeps this working
    // if Google moves things again.
    const g = libs.core ?? window.google?.maps
    const MarkerCtor = libs.markerLib?.Marker ?? g?.Marker
    if (!MarkerCtor) {
      console.error('Google Maps Marker constructor unavailable — no pins drawn')
      return
    }

    {
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current = []
      if (!infoRef.current) infoRef.current = new g.InfoWindow()

      const bounds = new g.LatLngBounds()
      let plotted = 0

      const attach = (marker, html) => {
        marker.addListener('mouseover', () => {
          infoRef.current.setContent(html)
          infoRef.current.open({ anchor: marker, map })
        })
        marker.addListener('mouseout', () => infoRef.current.close())
        markersRef.current.push(marker)
        bounds.extend(marker.getPosition())
        plotted += 1
      }

      mapProviders.forEach((provider) => {
        attach(new MarkerCtor({
          map,
          position: { lat: provider.lat, lng: provider.lng },
          title: provider.name,
          zIndex: 1,
          icon: {
            path: g.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: PRESENCE_COLORS[provider.availability] ?? PRESENCE_COLORS.OFFLINE,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        }), providerTooltip(provider))
      })

      // Orders sit above providers so a job pin is never hidden behind a dot.
      mapOrders.forEach((order) => {
        attach(new MarkerCtor({
          map,
          position: { lat: order.lat, lng: order.lng },
          title: order.orderNo,
          zIndex: 2,
          icon: {
            path: 'M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z',
            fillColor: ORDER_PIN_COLOR,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 1.5,
            scale: 1.1,
            anchor: new g.Point(12, 24),
          },
        }), orderTooltip(order))
      })

      // Fit the viewport to whatever we plotted. Without this the map stays on
      // its default centre and any marker outside that view is simply not on
      // screen — which reads as "no pins" even though they exist.
      if (plotted > 0) {
        map.fitBounds(bounds, 48)
        // fitBounds on a single point zooms to street level; clamp it so the
        // pin still sits in recognisable surroundings.
        g.event.addListenerOnce(map, 'bounds_changed', () => {
          if (map.getZoom() > 14) map.setZoom(14)
        })
      }
    }
  }, [hasValidKey, mapReady, mapProviders, mapOrders])

  useEffect(() => () => {
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    infoRef.current?.close()
  }, [])

  if (!hasValidKey) return null
  return <div ref={mapRef} className="map-visualization" />
}

function Dashboard() {
  const { hasPermission, loadingPermissions, isSuperAdmin, gatingUnavailable } = usePermissions()

  // Each dashboard block is gated on the same slug as its sidebar entry, so a
  // role only ever sees — and only ever fetches — what it is allowed to read.
  // Without this a limited role got the full UI populated with zeros, because
  // every request behind it came back 403.
  const canOrders = hasPermission('orders.view')
  const canProviders = hasPermission('providers.view')
  const canWallet = hasPermission('wallet.view')

  // The scoped cards below exist to give a limited role something useful in
  // place of the platform-wide KPIs. A super admin already gets the full
  // picture from the four headline cards, the map and the charts, so they stay
  // off there — same when gating is unavailable and everything reads as true.
  const showScopedCards = !isSuperAdmin && !gatingUnavailable
  const canDisputes = showScopedCards && hasPermission('disputes.view')
  const canServices = showScopedCards && hasPermission('services.view')
  const canCustomers = showScopedCards && hasPermission('customers.view')
  const canZones = showScopedCards && hasPermission('zones.view')

  const [selectedPeriod, setSelectedPeriod] = useState('7days')
  const [orderStats, setOrderStats] = useState({
    total: null, active: null, pending: null, broadcasted: null, unassigned: null,
  })
  const [spStats, setSpStats] = useState({ total: null, online: null, busy: null, offline: null })
  const [financeStats, setFinanceStats] = useState({ totalSales: null, revenue: null })
  const [disputeStats, setDisputeStats] = useState({ total: 0, open: 0, resolved: 0, rejected: 0 })
  const [catalogStats, setCatalogStats] = useState({ services: null, customers: null, zones: null })
  const [statsLoading, setStatsLoading] = useState(true)
  // Kept so the revenue chart can be derived — there is no time-series endpoint.
  const [orders, setOrders] = useState([])
  // Raw provider rows, for the operations map markers.
  const [providers, setProviders] = useState([])

  const contextMapKey = useGoogleMapsApiKey()
  const [mapApiKey, setMapApiKey] = useState('')

  // Riyadh as default map center
  const mapCenter = useMemo(() => ({ lat: 24.7136, lng: 46.6753 }), [])

  const fmtMoney = (n) =>
    Number(n || 0).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })

  useEffect(() => {
    // Wait until we know what this user may see, otherwise the first pass
    // fetches nothing and the blocks flash empty.
    if (loadingPermissions) return

    if (hasPermission('settings.view')) {
      getGoogleMapsKeyFromSettings()
        .then((value) => { if (value?.trim()) setMapApiKey(value.trim()) })
        .catch(() => {})
    }

    // statsLoading already starts true; the .finally below clears it.
    Promise.all([
      // A page of orders large enough to drive the revenue chart. The list
      // endpoint caps at its own default (10) when no limit is given.
      canOrders ? getAdminOrders({ limit: 500 }).catch(() => null) : null,
      canProviders ? getProviders({ limit: 100 }).catch(() => null) : null,
      canWallet ? getWalletOverview().catch(() => null) : null,
      canDisputes ? getDisputes().catch(() => null) : null,
      canServices ? getServices().catch(() => null) : null,
      canCustomers ? getCustomers({ limit: 1 }).catch(() => null) : null,
      canZones ? getZones().catch(() => null) : null,
    ]).then(([
      ordersData, providersData, walletData,
      disputesData, servicesData, customersData, zonesData,
    ]) => {
      // Disputes — PENDING/UNDER_REVIEW count as still open.
      if (disputesData) {
        const list = toList(disputesData, 'disputes', 'items', 'data')
        const by = (...statuses) =>
          list.filter(d => statuses.includes(String(d.status).toUpperCase())).length
        setDisputeStats({
          total: list.length,
          open: by('PENDING', 'UNDER_REVIEW'),
          resolved: by('RESOLVED'),
          rejected: by('REJECTED'),
        })
      }

      const servicesList = servicesData ? toList(servicesData, 'services', 'items', 'data') : null
      const zonesList = zonesData ? toList(zonesData, 'zones', 'items', 'data') : null
      const customersTotal = customersData
        ? (customersData?.meta?.total ?? customersData?.total
          ?? toList(customersData, 'customers', 'items', 'data').length)
        : null
      setCatalogStats({
        services: servicesList ? servicesList.length : null,
        customers: customersTotal != null ? Number(customersTotal) : null,
        zones: zonesList ? zonesList.length : null,
      })

      // Orders — the response is { orders, meta: { total } }.
      const orderList = Array.isArray(ordersData) ? ordersData : (ordersData?.orders ?? ordersData?.items ?? [])
      const totalOrders = ordersData?.meta?.total ?? ordersData?.total ?? orderList.length
      setOrders(orderList)
      const counts = countOrderStatuses(orderList)
      setOrderStats({
        total: totalOrders,
        active: counts.active,
        pending: counts.pending,
        broadcasted: counts.broadcasted,
        unassigned: counts.unassigned,
      })

      // Service Providers
      const spList = Array.isArray(providersData) ? providersData
        : (providersData?.providers ?? providersData?.items ?? providersData?.data ?? [])
      setProviders(spList)
      // meta.total is the real count; spList is only the page we fetched.
      const totalSP = providersData?.meta?.total ?? providersData?.total ?? spList.length
      const presence = countProviderPresence(spList)
      setSpStats({
        total: totalSP || null,
        online: presence.online,
        busy: presence.busy,
        offline: presence.offline,
      })

      // Sales & Revenue from wallet overview (completed orders + platform fee)
      const wallet = Array.isArray(walletData) ? walletData[0] : walletData
      const totalSales = wallet?.total_sales ?? wallet?.totalSales ?? null
      const revenue =
        wallet?.total_revenue ??
        wallet?.platform_commission ??
        wallet?.total_commission ??
        wallet?.platform_earnings ??
        null
      setFinanceStats({
        totalSales: totalSales != null ? Number(totalSales) : null,
        revenue: revenue != null ? Number(revenue) : null,
      })
    }).finally(() => setStatsLoading(false))
  }, [
    loadingPermissions, hasPermission,
    canOrders, canProviders, canWallet, canDisputes, canServices,
    canCustomers, canZones,
  ])

  const GOOGLE_MAPS_API_KEY = mapApiKey || contextMapKey

  // Marker data lives here so the header can report what actually got plotted —
  // an empty map is otherwise indistinguishable from a broken one.
  const mapProviders = useMemo(() => toMappableProviders(providers), [providers])
  const mapOrders = useMemo(() => toMappableOrders(canOrders ? orders : []), [orders, canOrders])

  const visibleBlocks = [
    canOrders, canProviders, canWallet, canDisputes, canServices,
    canCustomers, canZones,
  ].filter(Boolean).length

  const totalSPs = spStats.total ?? ((spStats.online + spStats.busy + spStats.offline) || 0)
  const spStatusData = {
    busy:    { count: spStats.busy ?? 0,    percentage: totalSPs ? Math.round((spStats.busy ?? 0)    / totalSPs * 100) : 0, color: '#F0B020' },
    online:  { count: spStats.online ?? 0,  percentage: totalSPs ? Math.round((spStats.online ?? 0)  / totalSPs * 100) : 0, color: '#10b981' },
    offline: { count: spStats.offline ?? 0, percentage: totalSPs ? Math.round((spStats.offline ?? 0) / totalSPs * 100) : 0, color: '#6b7280' },
  }

  /**
   * Order-value chart, derived from the order list above — there is no
   * time-series endpoint. Cancelled orders are excluded because they were
   * never worth anything; everything else counts.
   * 90 days is grouped into weeks — 90 daily bars is unreadable.
   */
  const revenueTrendsData = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const config = {
      '7days': { count: 7, step: 1 },
      '30days': { count: 30, step: 1 },
      '90days': { count: 13, step: 7 },
    }[selectedPeriod] ?? { count: 7, step: 1 }

    const buckets = Array.from({ length: config.count }, (_, i) => {
      const start = new Date(today.getTime() - (config.count - 1 - i) * config.step * dayMs)
      return {
        start,
        end: new Date(start.getTime() + config.step * dayMs),
        day: config.step === 1
          ? start.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
          : start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: 0,
        count: 0,
      }
    })

    const windowStart = buckets[0]?.start.getTime() ?? 0
    for (const order of orders) {
      if (String(order.status).toUpperCase() === 'CANCELLED') continue
      if (!order.created_at) continue
      const time = new Date(order.created_at).getTime()
      if (Number.isNaN(time) || time < windowStart) continue
      const index = Math.floor((time - windowStart) / (config.step * dayMs))
      if (index < 0 || index >= buckets.length) continue
      buckets[index].value += Number(order.total_price || 0)
      buckets[index].count += 1
    }

    return buckets
  }, [selectedPeriod, orders])

  const revenueHasData = revenueTrendsData.some(b => b.value > 0)
  const periodTotal = revenueTrendsData.reduce((sum, b) => sum + b.value, 0)
  const periodOrders = revenueTrendsData.reduce((sum, b) => sum + b.count, 0)

  return (
    <div className="dashboard">
      {!loadingPermissions && visibleBlocks === 0 && (
        <div className="dash-locked">
          <Lock size={30} />
          <h2>Nothing to show yet</h2>
          <p>
            Your role has no dashboard permissions. Ask an administrator to
            grant you access from Settings → Role Permissions.
          </p>
        </div>
      )}

      {/* Top Row - KPI Cards */}
      <div className="dashboard-top-row">
        {canOrders && (
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
        )}

        {canProviders && (
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
        )}

        {canWallet && (
        <div className="kpi-card">
          <div className="kpi-icon-wrapper sales">
            <DollarSign size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Total Sales</div>
            <div className="kpi-value">
              {statsLoading
                ? '—'
                : financeStats.totalSales != null
                  ? <><span className="riyal-symbol">&#x20C1;</span>{fmtMoney(financeStats.totalSales)}</>
                  : '—'}
            </div>
            <div className="kpi-trend positive">
              <TrendingUp size={14} />
              <span>Completed orders gross</span>
            </div>
          </div>
        </div>
        )}

        {canWallet && (
        <div className="kpi-card">
          <div className="kpi-icon-wrapper revenue">
            <Percent size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Revenue</div>
            <div className="kpi-value">
              {statsLoading
                ? '—'
                : financeStats.revenue != null
                  ? <><span className="riyal-symbol">&#x20C1;</span>{fmtMoney(financeStats.revenue)}</>
                  : '—'}
            </div>
            <div className="kpi-trend yellow">
              <TrendingUp size={14} />
              <span>Platform commission</span>
            </div>
          </div>
        </div>
        )}

        {canDisputes && (
          <>
            <div className="kpi-card">
              <div className="kpi-icon-wrapper disputes">
                <ShieldAlert size={24} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Open Disputes</div>
                <div className="kpi-value">
                  {statsLoading ? '—' : disputeStats.open.toLocaleString()}
                </div>
                <div className="kpi-trend yellow">
                  <AlertCircle size={14} />
                  <span>Pending &amp; under review</span>
                </div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-wrapper disputes">
                <AlertCircle size={24} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Total Disputes</div>
                <div className="kpi-value">
                  {statsLoading ? '—' : disputeStats.total.toLocaleString()}
                </div>
                <div className="kpi-trend">
                  <TrendingUp size={14} />
                  <span>All time</span>
                </div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-wrapper resolved">
                <CheckCircle2 size={24} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Resolved Disputes</div>
                <div className="kpi-value">
                  {statsLoading ? '—' : disputeStats.resolved.toLocaleString()}
                </div>
                <div className="kpi-trend positive">
                  <TrendingUp size={14} />
                  <span>Closed successfully</span>
                </div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-wrapper rejected">
                <XCircle size={24} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Rejected Disputes</div>
                <div className="kpi-value">
                  {statsLoading ? '—' : disputeStats.rejected.toLocaleString()}
                </div>
                <div className="kpi-trend">
                  <TrendingUp size={14} />
                  <span>Closed without action</span>
                </div>
              </div>
            </div>
          </>
        )}

        {canServices && (
          <div className="kpi-card">
            <div className="kpi-icon-wrapper services">
              <Wrench size={24} />
            </div>
            <div className="kpi-content">
              <div className="kpi-label">Services</div>
              <div className="kpi-value">
                {statsLoading ? '—' : (catalogStats.services ?? 0).toLocaleString()}
              </div>
              <div className="kpi-trend">
                <TrendingUp size={14} />
                <span>In the catalog</span>
              </div>
            </div>
          </div>
        )}

        {canCustomers && (
          <div className="kpi-card">
            <div className="kpi-icon-wrapper customers">
              <UserRound size={24} />
            </div>
            <div className="kpi-content">
              <div className="kpi-label">Customers</div>
              <div className="kpi-value">
                {statsLoading ? '—' : (catalogStats.customers ?? 0).toLocaleString()}
              </div>
              <div className="kpi-trend">
                <TrendingUp size={14} />
                <span>Registered accounts</span>
              </div>
            </div>
          </div>
        )}

        {canZones && (
          <div className="kpi-card">
            <div className="kpi-icon-wrapper zones">
              <MapPin size={24} />
            </div>
            <div className="kpi-content">
              <div className="kpi-label">Service Zones</div>
              <div className="kpi-value">
                {statsLoading ? '—' : (catalogStats.zones ?? 0).toLocaleString()}
              </div>
              <div className="kpi-trend">
                <TrendingUp size={14} />
                <span>Configured areas</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Section — provider positions, so it follows providers.view */}
      {canProviders && (
      <div className="dashboard-map-section">
        <div className="map-card">
          <div className="map-header">
            <div className="map-title-section">
              <AlertCircle size={20} className="map-title-icon" />
              <h3 className="map-title">Real-time Operations Map</h3>
              <span className="map-plot-count">
                {statsLoading
                  ? 'loading…'
                  : `${mapProviders.length} provider${mapProviders.length === 1 ? '' : 's'} · ${mapOrders.length} order${mapOrders.length === 1 ? '' : 's'}`}
              </span>
            </div>
            <div className="map-legend">
              <div className="legend-item"><div className="legend-dot online"></div><span>Online</span></div>
              <div className="legend-item"><div className="legend-dot busy"></div><span>Busy</span></div>
              {canOrders && (
                <div className="legend-item">
                  <div className="legend-pin" /><span>Active order</span>
                </div>
              )}
            </div>
          </div>

          <div className="map-container">
            {isGoogleMapsKeyValid(GOOGLE_MAPS_API_KEY) ? (
              <GoogleMapsAdvanced
                apiKey={GOOGLE_MAPS_API_KEY}
                center={mapCenter}
                mapProviders={mapProviders}
                mapOrders={mapOrders}
              />
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
                <span className="live-activity-label">Broadcasted:</span>
                <span className="live-activity-value purple">{orderStats.broadcasted ?? '—'}</span>
              </div>
              <div className="live-activity-item">
                <span className="live-activity-label">Active Orders:</span>
                <span className="live-activity-value blue">{orderStats.active ?? '—'}</span>
              </div>
              <div className="live-activity-item">
                <span className="live-activity-label">Pending Orders:</span>
                <span className="live-activity-value orange">{orderStats.pending ?? '—'}</span>
              </div>
              <div className="live-activity-item">
                <span className="live-activity-label">Online Providers:</span>
                <span className="live-activity-value green">{spStats.online ?? '—'}</span>
              </div>
              {(orderStats.active > 0 || orderStats.pending > 0) && (
                <div className="live-activity-progress">
                  <div className="live-activity-progress-bar">
                    {/* Share of open work still waiting on a provider. */}
                    <div
                      className="live-activity-progress-fill"
                      style={{ width: `${(orderStats.pending / (orderStats.active + orderStats.pending)) * 100}%` }}
                    />
                  </div>
                  <span className="live-activity-progress-note">
                    {orderStats.pending} of {orderStats.active + orderStats.pending} open awaiting a provider
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Bottom Row — the trend chart is derived from orders, the donut from
          providers, so each follows its own permission. */}
      {(canOrders || canProviders) && (
      <div className="dashboard-bottom-row">
        {/* Revenue Trends */}
        {canOrders && (
        <div className="trends-card">
          <div className="trends-header">
            <div className="trends-heading">
              <h3 className="trends-title">Order Value</h3>
              <p className="trends-summary">
                {statsLoading ? '—' : (
                  <>
                    <span className="riyal-symbol">&#x20C1;</span>
                    {fmtMoney(periodTotal)}
                    <span className="trends-summary-sub">
                      {' '}from {periodOrders.toLocaleString()} order{periodOrders === 1 ? '' : 's'}
                    </span>
                  </>
                )}
              </p>
            </div>
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
            {!statsLoading && !revenueHasData ? (
              <div className="chart-empty">
                <TrendingUp size={32} />
                <p>No orders in this period.</p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueTrendsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={false} tickFormatter={(v) => `\u20C1${v.toLocaleString()}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-base)', borderRadius: '8px', boxShadow: 'var(--shadow-md)', padding: '8px 12px' }}
                  formatter={(v, _name, item) => [
                    `\u20C1${Number(v).toLocaleString()} \u00B7 ${item?.payload?.count ?? 0} orders`,
                    'Order value',
                  ]}
                  labelStyle={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '4px' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {revenueTrendsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === revenueTrendsData.length - 1 ? '#D39A18' : '#F0B020'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>
        )}

        {/* SP Status */}
        {canProviders && (
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
        )}
      </div>
      )}
    </div>
  )
}

export default Dashboard
