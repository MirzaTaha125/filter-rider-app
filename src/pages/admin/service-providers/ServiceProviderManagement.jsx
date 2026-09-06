import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSocket } from '../../../contexts/SocketContext'
import {
  Search, Loader2, AlertTriangle, Users, UserCheck, Clock, Wifi,
  Star, MapPin, ChevronRight, CheckCircle,
} from 'lucide-react'
import { getProviders, getProviderSummary } from '../../../api'
import { getZones } from '../../../api/zones.js'
import {
  PROVIDER_STATUSES,
  LIVE_STATUSES,
  normalizeAvailability,
  titleCase,
  statusTone,
  availabilityTone,
  zoneLabel,
  initials,
  formatMoney,
  mapProviderRow,
} from './providers.js'
import SortableTh from '../../../components/DataTable/SortableTh'
import { useTableSort } from '../../../components/DataTable/useTableSort'
import ProviderRequests from './ProviderRequests'
import './ServiceProviderManagement.css'
import TableScroll from '../../../components/DataTable/TableScroll'

function toArray(value) {
  if (Array.isArray(value)) return value
  return value?.items ?? value?.serviceProviders ?? value?.users ?? value?.zones ?? value?.data ?? []
}

function ServiceProviderManagement() {
  const navigate = useNavigate()
  const { presenceSocket, connected } = useSocket()
  const wsConnected = connected.presence

  // Tab lives in the URL so it survives a refresh and stays linkable.
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'requests' ? 'requests' : 'providers'
  const setTab = (next) => {
    setSearchParams(next === 'requests' ? { tab: 'requests' } : {}, { replace: true })
  }

  const [filters, setFilters] = useState({
    search: '', status: 'All', zoneId: 'All', liveStatus: 'All',
  })
  const sort = useTableSort()
  const [providers, setProviders] = useState([])
  // Avatar ids whose image failed to load, so the row can show initials instead.
  const [brokenAvatars, setBrokenAvatars] = useState({})
  const [zones, setZones] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getZones({ limit: 100 }).then(d => setZones(toArray(d))).catch(() => {})
    getProviderSummary().then(setSummary).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    if (tab !== 'providers') return
    setLoading(true)
    setError('')
    try {
      const response = await getProviders({
        page: 1,
        limit: 100,
        search: filters.search || undefined,
        status: filters.status !== 'All' ? filters.status : undefined,
        zoneId: filters.zoneId !== 'All' ? filters.zoneId : undefined,
        liveStatus: filters.liveStatus !== 'All' ? filters.liveStatus : undefined,
      })
      // Pending providers live on the SP Requests page, not here.
      const rows = toArray(response)
        .filter(item => (item.provider_status ?? item.status) !== 'PENDING')
        .map(mapProviderRow)
      setProviders(rows)
    } catch (err) {
      setError(err.message || 'Failed to load service providers')
      setProviders([])
    } finally {
      setLoading(false)
    }
  }, [tab, filters.search, filters.status, filters.zoneId, filters.liveStatus])

  useEffect(() => { load() }, [load])

  // Live presence updates
  useEffect(() => {
    if (!presenceSocket) return
    const handler = (data) => {
      const id = data.providerId ?? data.id ?? data.provider_id
      const raw = data.liveStatus ?? data.live_status ?? data.status ?? data.availability
      if (!id || !raw) return
      const availability = normalizeAvailability(raw)
      setProviders(prev => prev.map(p => (p.id === id ? { ...p, availability } : p)))
    }
    presenceSocket.on('presence.status.updated', handler)
    return () => presenceSocket.off('presence.status.updated', handler)
  }, [presenceSocket])

  const setFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

  const onlineCount = providers.filter(p => p.availability === 'ONLINE').length

  const stats = [
    { label: 'Active providers', value: summary?.activeProviders, icon: UserCheck },
    { label: 'Pending requests', value: summary?.pendingRequests, icon: Clock },
    { label: 'Online now', value: onlineCount, icon: Wifi },
    { label: 'Total providers', value: summary?.totalProviders, icon: Users },
  ]

  const openProvider = (id) => navigate(`/admin/service-providers/${id}`)

  // Rating and earnings sort numerically, not on their rendered text.
  const sortedProviders = sort.apply(providers, {
    name: (p) => p.name,
    contact: (p) => p.phone,
    status: (p) => p.status,
    availability: (p) => p.availability,
    zone: (p) => p.zone,
    rating: (p) => Number(p.rating ?? 0),
    earnings: (p) => Number(p.totalEarnings ?? 0),
  })

  return (
    <div className="sp-management">
      <header className="dt-page-head">
        <div>
          {/* The page name is in the topbar; the socket indicator is not, so it
              moves up beside the description rather than being dropped. */}
          <p className="dt-page-sub">
            Approved providers on the platform.
            <span className={`spm-live ${wsConnected ? 'is-on' : ''}`}>
              <span className="spm-live-dot" />
              {wsConnected ? 'Live' : 'Connecting…'}
            </span>
          </p>
        </div>
      </header>

      <div className="spm-stats">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="spm-stat">
              <span className="spm-stat-icon"><Icon size={18} /></span>
              <span className="spm-stat-body">
                <span className="spm-stat-label">{stat.label}</span>
                <span className="spm-stat-value">{stat.value ?? '—'}</span>
              </span>
            </div>
          )
        })}
      </div>

      <div className="spm-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'providers'}
          className={`spm-tab ${tab === 'providers' ? 'is-active' : ''}`}
          onClick={() => setTab('providers')}
        >
          Service Providers
        </button>
        <button
          role="tab"
          aria-selected={tab === 'requests'}
          className={`spm-tab ${tab === 'requests' ? 'is-active' : ''}`}
          onClick={() => setTab('requests')}
        >
          Requests
          {summary?.pendingRequests > 0 && (
            <span className="spm-tab-count">{summary.pendingRequests}</span>
          )}
        </button>
      </div>

      {tab === 'requests' ? (
        <ProviderRequests />
      ) : (
      <>
      <div className="dt-toolbar">
        <div className="dt-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by name, phone, or email…"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
          />
        </div>
        <div className="dt-toolbar-actions">
          <select
            className="dt-field"
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value)}
            aria-label="Status"
          >
            <option value="All">All statuses</option>
            {PROVIDER_STATUSES.map(s => <option key={s} value={s}>{titleCase(s)}</option>)}
          </select>
          <select
            className="dt-field"
            value={filters.zoneId}
            onChange={(e) => setFilter('zoneId', e.target.value)}
            aria-label="Zone"
          >
            <option value="All">All zones</option>
            {zones.map(z => (
              <option key={z.id} value={z.id}>{zoneLabel(z)}</option>
            ))}
          </select>
          <select
            className="dt-field"
            value={filters.liveStatus}
            onChange={(e) => setFilter('liveStatus', e.target.value)}
            aria-label="Availability"
          >
            <option value="All">Any availability</option>
            {LIVE_STATUSES.map(s => <option key={s} value={s}>{titleCase(s)}</option>)}
          </select>
          <span className="spm-count">{loading ? '—' : `${providers.length} shown`}</span>
        </div>
      </div>

      {error && (
        <div className="spm-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="dt-empty">
          <Loader2 size={32} className="spin" />
          <span>Loading service providers…</span>
        </div>
      ) : providers.length === 0 ? (
        <div className="dt-empty">
          <Users size={32} />
          <h2>No providers found</h2>
          <p>Try clearing the filters, or check the SP Requests page for pending applications.</p>
        </div>
      ) : (
        <div className="dt-card">
          <TableScroll>
            <table className="dt-table">
              <thead>
                <tr>
                  <SortableTh sortKey="name" sort={sort}>Provider</SortableTh>
                  <SortableTh sortKey="contact" sort={sort}>Contact</SortableTh>
                  <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
                  <SortableTh sortKey="availability" sort={sort}>Availability</SortableTh>
                  <SortableTh sortKey="zone" sort={sort}>Zone</SortableTh>
                  <SortableTh sortKey="rating" sort={sort}>Rating</SortableTh>
                  <SortableTh sortKey="earnings" sort={sort} className="spm-num">Earnings</SortableTh>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {sortedProviders.map(sp => (
                  <tr
                    key={sp.id}
                    className="is-clickable"
                    onClick={() => openProvider(sp.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openProvider(sp.id)
                      }
                    }}
                  >
                    <td>
                      <span className="spm-profile">
                        <span className="spm-avatar">
                          {/* A photo that will not load leaves an empty circle,
                              so a failed load falls back to the initials. */}
                          {sp.avatar && !brokenAvatars[sp.id]
                            ? (
                              <img
                                src={sp.avatar}
                                alt=""
                                onError={() => setBrokenAvatars(prev => ({ ...prev, [sp.id]: true }))}
                              />
                            )
                            : initials(sp.name)}
                        </span>
                        <span className="spm-profile-text">
                          <strong>
                            {sp.name}
                            {sp.verified && <CheckCircle size={14} className="spm-verified" />}
                          </strong>
                          <em>
                            {sp.totalOrders} order{sp.totalOrders === 1 ? '' : 's'}
                            {sp.completedJobs > 0 && ` · ${sp.completedJobs} done`}
                          </em>
                        </span>
                      </span>
                    </td>
                    <td className="spm-contact">
                      <span>{sp.phone}</span>
                      <em>{sp.email}</em>
                    </td>
                    <td>
                      <span className={`dt-status dt-status--${statusTone(sp.status)}`}>
                        {titleCase(sp.status)}
                      </span>
                    </td>
                    <td>
                      <span className={`dt-dot-label dt-tone--${availabilityTone(sp.availability)}`}>
                        <span className="dt-dot" />
                        {titleCase(sp.availability)}
                      </span>
                    </td>
                    <td className="dt-muted">
                      <span className="spm-zone"><MapPin size={13} /> {sp.zone}</span>
                    </td>
                    <td>
                      <span className="spm-rating">
                        <Star size={13} />
                        {Number(sp.rating).toFixed(1)}
                      </span>
                    </td>
                    <td className="spm-num spm-earnings">
                      <span className="riyal-symbol">&#x20C1;</span>{formatMoney(sp.totalEarnings)}
                    </td>
                    <td className="dt-col-actions"><ChevronRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </div>
      )}
      </>
      )}
    </div>
  )
}

export default ServiceProviderManagement
