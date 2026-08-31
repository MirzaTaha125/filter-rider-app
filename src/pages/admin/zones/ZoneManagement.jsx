import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, MapPin, Users, RefreshCw,
  Loader2, AlertTriangle, Search,
} from 'lucide-react'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import { getZones, deleteZone, refreshZoneProviderCounts } from '../../../api'
import './ZoneManagement.css'

function toArray(value) {
  if (Array.isArray(value)) return value
  return value?.zones ?? value?.items ?? value?.data ?? []
}

function ZoneManagement() {
  const navigate = useNavigate()

  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setError('')
    try {
      setZones(toArray(await getZones()))
    } catch (err) {
      setError(err.message || 'Failed to load zones')
      setZones([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /**
   * `service_providers_count` is a stored column that only changes when this
   * endpoint recomputes it, so the list can drift as providers move zones.
   */
  const handleRefreshCounts = async () => {
    setRefreshing(true)
    setError('')
    setNotice('')
    try {
      await refreshZoneProviderCounts()
      await load()
      setNotice('Provider counts recalculated.')
    } catch (err) {
      setError(err.message || 'Failed to refresh provider counts')
    } finally {
      setRefreshing(false)
    }
  }

  const askDelete = (zone) => {
    const count = zone.service_providers_count ?? 0
    setConfirm({
      zone,
      message: count > 0
        ? `Delete "${zone.zone_name}"? ${count} provider${count === 1 ? ' is' : 's are'} assigned to it and will be left without a zone.`
        : `Delete "${zone.zone_name}"? This cannot be undone.`,
    })
  }

  const handleDelete = async (zone) => {
    const previous = zones
    setZones(list => list.filter(z => z.id !== zone.id))
    try {
      await deleteZone(zone.id)
    } catch (err) {
      setZones(previous)
      setError(err.message || 'Failed to delete zone')
    }
  }

  const term = search.trim().toLowerCase()
  const visible = zones.filter(z =>
    !term ||
    (z.zone_name || '').toLowerCase().includes(term) ||
    (z.city || '').toLowerCase().includes(term),
  )

  const activeCount = zones.filter(z => z.is_active !== false).length

  return (
    <div className="zone-management">
      <header className="zm-header">
        <div>
          <h1 className="zm-title">Zones</h1>
          <p className="zm-subtitle">Service areas and their coverage.</p>
        </div>
        <div className="zm-header-actions">
          <button
            className="zm-btn zm-btn--secondary"
            onClick={handleRefreshCounts}
            disabled={refreshing || loading}
            title="Recalculate how many providers are assigned to each zone"
          >
            {refreshing
              ? <><Loader2 size={15} className="spin" /> Refreshing…</>
              : <><RefreshCw size={15} /> Refresh counts</>}
          </button>
          <button className="zm-btn zm-btn--primary" onClick={() => navigate('/admin/zones/add')}>
            <Plus size={18} />
            Add Zone
          </button>
        </div>
      </header>

      <div className="zm-toolbar">
        <div className="zm-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by zone or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="zm-count">
          {loading ? '—' : `${zones.length} zone${zones.length === 1 ? '' : 's'} · ${activeCount} active`}
        </span>
      </div>

      {error && (
        <div className="zm-alert zm-alert--error">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {notice && (
        <div className="zm-alert zm-alert--ok">
          <RefreshCw size={16} />
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {loading ? (
        <div className="zm-state">
          <Loader2 size={32} className="spin" />
          <span>Loading zones…</span>
        </div>
      ) : zones.length === 0 ? (
        <div className="zm-state">
          <MapPin size={32} />
          <h2>No zones yet</h2>
          <p>Create a zone to define where services are offered.</p>
          <button className="zm-btn zm-btn--primary" onClick={() => navigate('/admin/zones/add')}>
            <Plus size={16} /> Add Zone
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="zm-state">
          <Search size={32} />
          <h2>No matches</h2>
          <p>No zones match “{search.trim()}”.</p>
        </div>
      ) : (
        <div className="zm-grid">
          {visible.map(zone => {
            const active = zone.is_active !== false
            const count = zone.service_providers_count ?? 0
            return (
              <article key={zone.id} className={`zm-card ${active ? '' : 'is-inactive'}`}>
                <header className="zm-card-top">
                  <span className="zm-card-icon"><MapPin size={18} /></span>
                  <span className={`zm-badge ${active ? 'is-active' : 'is-inactive'}`}>
                    {active ? 'Active' : 'Inactive'}
                  </span>
                </header>

                <h2 className="zm-card-title">{zone.zone_name}</h2>
                <p className="zm-card-city">{zone.city}</p>

                <p className="zm-card-stat">
                  <Users size={14} />
                  {count} provider{count === 1 ? '' : 's'}
                </p>

                {zone.center_lat != null && zone.center_lng != null && (
                  <p className="zm-card-coords">
                    {Number(zone.center_lat).toFixed(4)}, {Number(zone.center_lng).toFixed(4)}
                  </p>
                )}

                <footer className="zm-card-actions">
                  <button
                    className="zm-btn zm-btn--ghost"
                    onClick={() => navigate(`/admin/zones/${zone.id}/edit`)}
                  >
                    <Pencil size={15} /> Edit
                  </button>
                  <button
                    className="zm-icon-btn zm-icon-btn--danger"
                    onClick={() => askDelete(zone)}
                    title={`Delete ${zone.zone_name}`}
                    aria-label={`Delete ${zone.zone_name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </footer>
              </article>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete zone"
        message={confirm?.message}
        confirmLabel="Delete zone"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const pending = confirm
          setConfirm(null)
          if (pending) handleDelete(pending.zone)
        }}
      />
    </div>
  )
}

export default ZoneManagement
