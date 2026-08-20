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
import ProviderRequests from './ProviderRequests'
import './ServiceProviderManagement.css'

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
  const [providers, setProviders] = useState([])
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

  return (
    <div className="sp-management">
      <header className="spm-header">
        <div>
          <h1 className="spm-title">
            Service Providers
            <span className={`spm-live ${wsConnected ? 'is-on' : ''}`}>
              <span className="spm-live-dot" />
              {wsConnected ? 'Live' : 'Connecting…'}
            </span>
          </h1>
          <p className="spm-subtitle">Approved providers on the platform.</p>
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
      <div className="spm-toolbar">
        <div className="spm-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by name, phone, or email…"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
          />
        </div>
        <select className="spm-filter" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="All">All statuses</option>
          {PROVIDER_STATUSES.map(s => <option key={s} value={s}>{titleCase(s)}</option>)}
        </select>
        <select className="spm-filter" value={filters.zoneId} onChange={(e) => setFilter('zoneId', e.target.value)}>
          <option value="All">All zones</option>
          {zones.map(z => (
            <option key={z.id} value={z.id}>{zoneLabel(z)}</option>
          ))}
        </select>
        <select className="spm-filter" value={filters.liveStatus} onChange={(e) => setFilter('liveStatus', e.target.value)}>
          <option value="All">Any availability</option>
          {LIVE_STATUSES.map(s => <option key={s} value={s}>{titleCase(s)}</option>)}
        </select>
        <span className="spm-count">{loading ? '—' : `${providers.length} shown`}</span>
      </div>

      {error && (
        <div className="spm-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="spm-state">
          <Loader2 size={32} className="spin" />
          <span>Loading service providers…</span>
        </div>
      ) : providers.length === 0 ? (
        <div className="spm-state">
          <Users size={32} />
          <h2>No providers found</h2>
          <p>Try clearing the filters, or check the SP Requests page for pending applications.</p>
        </div>
      ) : (
        <div className="spm-table-card">
          <div className="spm-table-wrap">
            <table className="spm-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Availability</th>
                  <th>Zone</th>
                  <th>Rating</th>
                  <th className="spm-num">Earnings</th>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {providers.map(sp => (
                  <tr
                    key={sp.id}
                    className="spm-row"
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
                          {sp.avatar ? <img src={sp.avatar} alt="" /> : initials(sp.name)}
                        </span>
                        <span className="spm-profile-text">
                          <strong>
                            {sp.name}
                            {sp.verified && <CheckCircle size={14} className="spm-verified" />}
                          </strong>
                          <em>{sp.totalOrders} orders</em>
                        </span>
                      </span>
                    </td>
                    <td className="spm-contact">
                      <span>{sp.phone}</span>
                      <em>{sp.email}</em>
                    </td>
                    <td>
                      <span className={`spm-badge spm-badge--${statusTone(sp.status)}`}>
                        {titleCase(sp.status)}
                      </span>
                    </td>
                    <td>
                      <span className={`spm-avail spm-avail--${availabilityTone(sp.availability)}`}>
                        <span className="spm-avail-dot" />
                        {titleCase(sp.availability)}
                      </span>
                    </td>
                    <td className="spm-muted">
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
                    <td className="spm-chevron"><ChevronRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}

export default ServiceProviderManagement
