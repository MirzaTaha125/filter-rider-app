import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, MapPin, Calendar, Filter,
  ChevronDown, CheckCircle2, Lock,
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  getGoogleMapsKeyFromSettings, getAdminOrders, getProviders, getWalletOverview,
  getDisputes, getServices, getCustomers, getZones,
} from '../../../api'
import { useGoogleMapsApiKey } from '../../../contexts/AppSettingsContext'
import { usePermissions } from '../../../contexts/PermissionsContext'
import {
  countOrderStatuses, countProviderPresence, normalizeStatus, isOpen,
} from '../orders/orderStatus'
import StatTile from '../../../components/StatTile/StatTile'
import { providerMarkerIcon } from '../../../components/map/providerPin'
import { orderMarkerIcon, ORDER_PIN_COLOR, ORDER_PIN_SRC } from '../../../components/map/orderPin'
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

const PRESENCE_COLORS = { ONLINE: '#10b981', BUSY: '#FCC245', OFFLINE: '#6b7280' }

/**
 * Single ratio against a limit — a meter, drawn as a ring. The unfilled track
 * is a lighter step of the same hue so the state reads across the whole arc.
 */
function Ring({ label, value, pct, sub }) {
  const safe = Math.max(0, Math.min(100, Number(pct) || 0))
  return (
    <div className="dash-ring">
      <div
        className="dash-ring-arc"
        style={{
          background: `conic-gradient(var(--primary-color) ${safe * 3.6}deg, var(--primary-soft) 0deg)`,
        }}
        role="img"
        aria-label={`${label}: ${value}`}
      >
        <span className="dash-ring-hole" />
      </div>
      <div className="dash-ring-text">
        <span className="dash-ring-label">{label}</span>
        <strong className="dash-ring-value">{value}</strong>
        {sub && <em className="dash-ring-sub">{sub}</em>}
      </div>
    </div>
  )
}

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
        const ring = PRESENCE_COLORS[provider.availability] ?? PRESENCE_COLORS.OFFLINE
        const marker = new MarkerCtor({
          map,
          position: { lat: provider.lat, lng: provider.lng },
          title: provider.name,
          zIndex: 1,
          // The plain dot is drawn first so pins appear immediately; the pin
          // artwork swaps in once its canvas is ready. If the artwork fails to
          // load the dot simply stays, which is the old behaviour.
          icon: {
            path: g.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: ring,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        })
        providerMarkerIcon(g, ring).then((icon) => {
          // The effect may have torn down and rebuilt markers while the canvas
          // was rasterising; only dress a marker still on a map.
          if (icon && marker.getMap()) marker.setIcon(icon)
        })
        attach(marker, providerTooltip(provider))
      })

      // Orders sit above providers so a job pin is never hidden behind a van.
      mapOrders.forEach((order) => {
        const marker = new MarkerCtor({
          map,
          position: { lat: order.lat, lng: order.lng },
          title: order.orderNo,
          zIndex: 2,
          icon: {
            path: g.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: ORDER_PIN_COLOR,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        })
        orderMarkerIcon(g).then((icon) => {
          if (icon && marker.getMap()) marker.setIcon(icon)
        })
        attach(marker, orderTooltip(order))
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
  const navigate = useNavigate()
  const { hasPermission, loadingPermissions, isSuperAdmin, gatingUnavailable } = usePermissions()
  // Greeting name — the profile call lives in TopBar, so fall back to the role.
  const adminName = isSuperAdmin ? 'Super Admin' : 'Admin'
  // One reference clock per mount: deriving "now" during render would make the
  // week-on-week figures shift on every incidental re-render.
  const [nowTs] = useState(() => Date.now())


  // Each dashboard block is gated on the same slug as its sidebar entry, so a
  // role only ever sees — and only ever fetches — what it is allowed to read.
  // Without this a limited role got the full UI populated with zeros, because
  // every request behind it came back 403.
  const canOrders = hasPermission('orders.view')
  const canProviders = hasPermission('providers.view')
  const canWallet = hasPermission('wallet.view')

  // The money tiles open Analytics, where the sales and revenue breakdowns
  // live. A role with wallet access but no analytics would land on a page it
  // cannot read, so those fall back to the wallet they can see.
  const salesTarget = hasPermission('analytics.view')
    ? '/admin/analytics'
    : '/admin/wallet'

  // The scoped cards below exist to give a limited role something useful in
  // place of the platform-wide KPIs. A super admin already gets the full
  // picture from the four headline cards, the map and the charts, so they stay
  // off there — same when gating is unavailable and everything reads as true.
  const showScopedCards = !isSuperAdmin && !gatingUnavailable
  const canDisputes = showScopedCards && hasPermission('disputes.view')
  const canServices = showScopedCards && hasPermission('services.view')
  const canCustomers = showScopedCards && hasPermission('customers.view')
  const canZones = showScopedCards && hasPermission('zones.view')

  // Date range + service. Both are real query params on GET /admin/orders, so
  // they narrow the data at the source rather than filtering what came back.
  const [preset, setPreset] = useState('7days')
  const [customRange, setCustomRange] = useState({ from: '', to: '' })
  const [serviceFilter, setServiceFilter] = useState('All Services')
  const [serviceOptions, setServiceOptions] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  /**
   * Resolves the chosen preset (or custom dates) into a concrete window.
   * `to` is the end of its day so an inclusive date picker behaves as read.
   */
  const range = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000
    const end = new Date(nowTs)
    end.setHours(23, 59, 59, 999)

    if (preset === 'custom' && (customRange.from || customRange.to)) {
      const from = customRange.from ? new Date(`${customRange.from}T00:00:00`) : null
      const to = customRange.to ? new Date(`${customRange.to}T23:59:59`) : end
      return {
        from,
        to,
        label: from
          ? `${from.toLocaleDateString()} – ${to.toLocaleDateString()}`
          : `Up to ${to.toLocaleDateString()}`,
      }
    }

    if (preset === 'mtd') {
      const from = new Date(nowTs)
      from.setDate(1)
      from.setHours(0, 0, 0, 0)
      return { from, to: end, label: 'This month' }
    }

    const days = { '7days': 7, '30days': 30, '90days': 90 }[preset] ?? 7
    const from = new Date(end.getTime() - (days - 1) * dayMs)
    from.setHours(0, 0, 0, 0)
    return { from, to: end, label: `Last ${days} days` }
  }, [preset, customRange.from, customRange.to, nowTs])

  // ISO strings rather than the Date objects: stable identities the fetch
  // effect can depend on directly.
  const fromIso = range.from ? range.from.toISOString() : undefined
  const toIso = range.to.toISOString()
  const activeFilterCount = (preset !== '7days' ? 1 : 0)
    + (serviceFilter !== 'All Services' ? 1 : 0)
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
      canOrders ? getAdminOrders({
        limit: 500,
        from: fromIso,
        to: toIso,
        serviceId: serviceFilter,
      }).catch(() => null) : null,
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
      if (servicesList) setServiceOptions(servicesList)
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
        completed: counts.completed,
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
    fromIso, toIso, serviceFilter,
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

  /**
   * Order-value chart, derived from the order list above — there is no
   * time-series endpoint. Cancelled orders are excluded because they were
   * never worth anything; everything else counts.
   *
   * Buckets span whatever range is selected. Anything past ~5 weeks is grouped
   * weekly — 90 daily bars is unreadable.
   */
  const revenueTrendsData = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000

    const end = new Date(range.to)
    end.setHours(0, 0, 0, 0)
    const start = new Date(range.from ?? end.getTime() - 6 * dayMs)
    start.setHours(0, 0, 0, 0)

    const spanDays = Math.max(1, Math.round((end - start) / dayMs) + 1)
    const step = spanDays > 35 ? 7 : 1
    const count = Math.max(1, Math.ceil(spanDays / step))

    const buckets = Array.from({ length: count }, (_, i) => {
      const bucketStart = new Date(start.getTime() + i * step * dayMs)
      return {
        start: bucketStart,
        day: step === 1
          ? (spanDays <= 8
            ? bucketStart.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
            : bucketStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }))
          : bucketStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
      const index = Math.floor((time - windowStart) / (step * dayMs))
      if (index < 0 || index >= buckets.length) continue
      buckets[index].value += Number(order.total_price || 0)
      buckets[index].count += 1
    }

    return buckets
  }, [range, orders])

  const revenueHasData = revenueTrendsData.some(b => b.value > 0)
  const periodTotal = revenueTrendsData.reduce((sum, b) => sum + b.value, 0)
  const periodOrders = revenueTrendsData.reduce((sum, b) => sum + b.count, 0)

  /**
   * Week-on-week movement, derived from the same order list. There is no
   * historical endpoint, so a delta is only shown when both weeks are inside
   * the fetched window — a made-up "+0%" would be worse than no delta.
   */
  const weekly = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000
    const now = nowTs
    const thisWeek = { count: 0, value: 0 }
    const lastWeek = { count: 0, value: 0 }

    for (const order of orders) {
      if (normalizeStatus(order.status) === 'CANCELLED') continue
      const time = new Date(order.created_at).getTime()
      if (Number.isNaN(time)) continue
      const age = now - time
      const bucket = age < 7 * dayMs ? thisWeek : age < 14 * dayMs ? lastWeek : null
      if (!bucket) continue
      bucket.count += 1
      bucket.value += Number(order.total_price || 0)
    }

    const delta = (current, previous) => {
      if (!previous) return null
      return ((current - previous) / previous) * 100
    }

    return {
      orders: delta(thisWeek.count, lastWeek.count),
      sales: delta(thisWeek.value, lastWeek.value),
    }
  }, [orders, nowTs])

  /** 12-point sparkline of order volume for the accent tile. */
  const sparkline = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000
    const today = new Date(nowTs)
    today.setHours(0, 0, 0, 0)
    const points = Array.from({ length: 12 }, (_, i) => ({
      start: today.getTime() - (11 - i) * dayMs,
      v: 0,
    }))
    for (const order of orders) {
      const time = new Date(order.created_at).getTime()
      if (Number.isNaN(time)) continue
      const index = Math.floor((time - points[0].start) / dayMs)
      if (index >= 0 && index < points.length) points[index].v += 1
    }
    return points
  }, [orders, nowTs])

  /** Open orders still waiting on a provider — the dashboard's action list. */
  const needsAttention = useMemo(() => (
    orders
      .filter(o => isOpen(o) && !(o.provider_id ?? o.provider?.id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 6)
  ), [orders])

  const avgOrderValue = orderStats.total && periodOrders
    ? periodTotal / periodOrders
    : null

  const onlinePct = totalSPs ? Math.round(((spStats.online ?? 0) / totalSPs) * 100) : 0
  const completionPct = orderStats.total
    ? Math.round(((orderStats.completed ?? 0) / orderStats.total) * 100)
    : 0

  const greeting = (() => {
    const hour = new Date(nowTs).getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  const periodLabel = range.label

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

      {visibleBlocks > 0 && (
      <>
      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <header className="dash-head">
        <div className="dash-head-text">
          <h1 className="dash-greeting">
            {greeting}, <strong>{adminName}</strong>
          </h1>
          <p className="dash-head-sub">Your platform summary · {periodLabel.toLowerCase()}</p>
        </div>
        <div className="dash-head-tools">
          <div className="dash-period">
            <Calendar size={15} />
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              aria-label="Reporting period"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
              <option value="mtd">This month</option>
              <option value="custom">Custom range…</option>
            </select>
            <ChevronDown size={15} />
          </div>

          <button
            className={`dash-filter-btn ${filtersOpen ? 'is-active' : ''}`}
            onClick={() => setFiltersOpen(o => !o)}
          >
            <Filter size={15} />
            Filters
            {activeFilterCount > 0 && <span className="dash-filter-count">{activeFilterCount}</span>}
            <ChevronDown size={15} className={filtersOpen ? 'is-flipped' : ''} />
          </button>
        </div>
      </header>

      {(filtersOpen || preset === 'custom') && (
        <div className="dash-filters">
          <div className="dash-filter-field">
            <label htmlFor="dash-from">From</label>
            <input
              id="dash-from"
              type="date"
              value={customRange.from}
              max={customRange.to || undefined}
              onChange={(e) => {
                setCustomRange(r => ({ ...r, from: e.target.value }))
                setPreset('custom')
              }}
            />
          </div>
          <div className="dash-filter-field">
            <label htmlFor="dash-to">To</label>
            <input
              id="dash-to"
              type="date"
              value={customRange.to}
              min={customRange.from || undefined}
              onChange={(e) => {
                setCustomRange(r => ({ ...r, to: e.target.value }))
                setPreset('custom')
              }}
            />
          </div>

          {canServices && (
            <div className="dash-filter-field">
              <label htmlFor="dash-service">Service</label>
              <select
                id="dash-service"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
              >
                <option value="All Services">All services</option>
                {serviceOptions.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name_en ?? service.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeFilterCount > 0 && (
            <button
              className="dash-filter-btn dash-filter-btn--ghost"
              onClick={() => {
                setPreset('7days')
                setCustomRange({ from: '', to: '' })
                setServiceFilter('All Services')
              }}
            >
              Reset
            </button>
          )}

          {/* Honest about scope: only the orders endpoint takes these params. */}
          <p className="dash-filter-note">
            Applies to order figures and the map. Provider, wallet and catalog
            counts are current totals and are not date-filtered.
          </p>
        </div>
      )}

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      <div className="stat-tile-row">
        {canOrders && (
          <StatTile
            label="Total orders"
            value={statsLoading ? null : orderStats.total}
            delta={weekly.orders}
            deltaLabel="vs last week"
            onClick={() => navigate('/admin/orders')}
          />
        )}
        {canOrders && (
          <StatTile
            label="Active orders"
            value={statsLoading ? null : orderStats.active}
            hint={`${orderStats.broadcasted ?? 0} broadcasted`}
            onClick={() => navigate('/admin/orders?status=Broadcasted')}
          />
        )}
        {canProviders && (
          <StatTile
            label="Service providers"
            value={statsLoading ? null : totalSPs}
            hint={`${spStats.online ?? 0} online · ${spStats.busy ?? 0} busy`}
            onClick={() => navigate('/admin/service-providers')}
          />
        )}
        {canWallet && (
          <StatTile
            label="Total sales"
            value={statsLoading ? null : financeStats.totalSales}
            money
            delta={weekly.sales}
            deltaLabel="vs last week"
            onClick={() => navigate(salesTarget)}
          />
        )}
        {canWallet && (
          <StatTile
            label="Revenue"
            value={statsLoading ? null : financeStats.revenue}
            money
            hint="Platform commission"
            onClick={() => navigate(salesTarget)}
          />
        )}
        {canOrders && (
          <StatTile
            label="Avg order value"
            value={statsLoading ? null : avgOrderValue}
            money
            hint={periodLabel.toLowerCase()}
          />
        )}

        {canDisputes && (
          <>
            <StatTile label="Open disputes" value={statsLoading ? null : disputeStats.open} hint="Pending & under review" onClick={() => navigate('/admin/disputes')} />
            <StatTile label="Resolved disputes" value={statsLoading ? null : disputeStats.resolved} hint={`${disputeStats.total} all time`} onClick={() => navigate('/admin/disputes')} />
            <StatTile label="Rejected disputes" value={statsLoading ? null : disputeStats.rejected} hint="Closed without action" onClick={() => navigate('/admin/disputes')} />
          </>
        )}
        {canServices && (
          <StatTile label="Services" value={statsLoading ? null : catalogStats.services} hint="In the catalog" onClick={() => navigate('/admin/services')} />
        )}
        {canCustomers && (
          <StatTile label="Customers" value={statsLoading ? null : catalogStats.customers} hint="Registered accounts" onClick={() => navigate('/admin/customers')} />
        )}
        {canZones && (
          <StatTile label="Service zones" value={statsLoading ? null : catalogStats.zones} hint="Configured areas" onClick={() => navigate('/admin/zones')} />
        )}
      </div>

      {/* ── Map + side column ────────────────────────────────────────────── */}
      <div className="dash-main">
        {/* Full-bleed map: the title, legend and plotted-count line were moved
            out on request — mapProviders/mapOrders still carry the counts for
            wherever they land next. */}
        {canProviders && (
          <section className="dash-card dash-map">
            <div className="dash-map-body">
              {isGoogleMapsKeyValid(GOOGLE_MAPS_API_KEY) ? (
                <GoogleMapsAdvanced
                  apiKey={GOOGLE_MAPS_API_KEY}
                  center={mapCenter}
                  mapProviders={mapProviders}
                  mapOrders={mapOrders}
                />
              ) : (
                <div className="map-placeholder">
                  <MapPin size={40} />
                  <p className="map-placeholder-title">Map not available</p>
                  <p className="map-placeholder-text">
                    Add a valid <strong>Google Maps API key</strong> in <strong>Settings → API Keys</strong>,
                    with <strong>Maps JavaScript API</strong> enabled for it.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        <div className="dash-side">
          {canOrders && (
            <section className="dash-accent">
              <h2>Live right now</h2>
              <p className="dash-accent-label">Orders in flight</p>
              <div className="dash-hero">{statsLoading ? '—' : (orderStats.active ?? 0)}</div>
              <p className="dash-accent-foot">
                {orderStats.pending ?? 0} waiting to be broadcast
              </p>
              <div className="dash-spark">
                <ResponsiveContainer width="100%" height={64}>
                  <LineChart data={sparkline} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke="#1a1a1a"
                      strokeOpacity={0.55}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {(canProviders || canOrders) && (
            <section className="dash-card dash-rings">
              {canProviders && (
                <Ring
                  label="Providers online"
                  value={`${onlinePct}%`}
                  pct={onlinePct}
                  sub={`${spStats.online ?? 0} of ${totalSPs}`}
                />
              )}
              {canOrders && (
                <Ring
                  label="Orders completed"
                  value={`${completionPct}%`}
                  pct={completionPct}
                  sub={`${orderStats.completed ?? 0} of ${orderStats.total ?? 0}`}
                />
              )}
            </section>
          )}

          {/* The map's own caption lives here rather than over the map, so the
              map itself stays full-bleed. */}
          {canProviders && (
            <section className="dash-card dash-mapinfo">
              <h2>Real-time operations map</h2>
              <p>Online providers and the jobs currently in flight</p>

              <div className="dash-legend">
                <span><i className="dash-dot dash-dot--online" />Online</span>
                <span><i className="dash-dot dash-dot--busy" />Busy</span>
                {canOrders && (
                  <span>
                    <img src={ORDER_PIN_SRC} alt="" className="dash-pin" />
                    Active order
                  </span>
                )}
              </div>

              <p className="dash-mapinfo-count">
                {statsLoading
                  ? 'Loading…'
                  : `${mapProviders.length} provider${mapProviders.length === 1 ? '' : 's'} · ${mapOrders.length} active order${mapOrders.length === 1 ? '' : 's'} plotted`}
              </p>
            </section>
          )}
        </div>
      </div>

      {/* ── Bottom row ───────────────────────────────────────────────────── */}
      {canOrders && (
      <div className="dash-bottom">
        <section className="dash-card">
          <header className="dash-card-head">
            <div>
              <h2>Order value</h2>
              <p>
                {statsLoading ? '—' : (
                  <>
                    <span className="riyal-symbol">&#x20C1;</span>
                    {fmtMoney(periodTotal)} from {periodOrders.toLocaleString()} order{periodOrders === 1 ? '' : 's'}
                  </>
                )}
              </p>
            </div>
          </header>

          <div className="dash-chart">
            {!revenueHasData ? (
              <div className="dash-empty">
                <TrendingUp size={26} />
                <span>No order value in this period yet.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueTrendsData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-base)" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--border-light)' }}
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-base)',
                      borderRadius: 10,
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                    }}
                    formatter={(value) => [`SAR ${fmtMoney(value)}`, 'Order value']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={34}>
                    {revenueTrendsData.map((entry, index) => (
                      <Cell key={index} fill="var(--primary-color)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="dash-card">
          <header className="dash-card-head">
            <div>
              <h2>Needs a provider</h2>
              <p>Open orders nobody has accepted yet</p>
            </div>
            {needsAttention.length > 0 && (
              <span className="dash-count">{needsAttention.length}</span>
            )}
          </header>

          <div className="dash-list">
            {statsLoading ? (
              <div className="dash-empty"><span>Loading…</span></div>
            ) : needsAttention.length === 0 ? (
              <div className="dash-empty">
                <CheckCircle2 size={26} />
                <span>Every open order has a provider.</span>
              </div>
            ) : (
              needsAttention.map((order) => (
                <button
                  key={order.id}
                  className="dash-list-row"
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                >
                  <span className="dash-list-main">
                    <strong>{order.order_no ?? `#${String(order.id).slice(0, 8)}`}</strong>
                    <em>{order.service?.name_en ?? order.service?.name ?? 'Service'}</em>
                  </span>
                  <span className={`dash-chip dash-chip--${normalizeStatus(order.status).toLowerCase()}`}>
                    {normalizeStatus(order.status).replace(/_/g, ' ')}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
      )}
      </>
      )}
    </div>
  )
}

export default Dashboard
