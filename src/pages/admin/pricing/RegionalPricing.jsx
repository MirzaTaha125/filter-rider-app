import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, MapPin, Loader2, AlertTriangle, Search,
} from 'lucide-react'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import { getRegionalPricing, deleteRegionalPricing } from '../../../api/pricing.js'
import { getZones } from '../../../api/zones.js'
import './RegionalPricing.css'

function toZoneList(data) {
  if (Array.isArray(data)) return data
  return data?.zones ?? data?.items ?? data?.data ?? []
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function RegionalPricing() {
  const navigate = useNavigate()

  const [regions, setRegions] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)

  const loadData = useCallback(async () => {
    setError('')
    try {
      const [regionsData, zonesData] = await Promise.all([
        getRegionalPricing(),
        getZones(),
      ])
      setRegions(toArray(regionsData))
      setZones(toZoneList(zonesData))
    } catch (err) {
      setError(err.message || 'Failed to load regional pricing')
      setRegions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const zoneOf = (region) => zones.find(z => z.id === region.zone_id)

  const zoneName = (region) =>
    region.zone?.zone_name ?? zoneOf(region)?.zone_name ?? '—'

  const zoneCity = (region) =>
    region.zone?.city ?? zoneOf(region)?.city ?? ''

  const askDelete = (region) => {
    setConfirm({
      region,
      message: `Delete regional pricing for ${zoneName(region)}? Bookings in that zone will fall back to standard platform pricing.`,
    })
  }

  const handleDelete = async (region) => {
    const previous = regions
    setRegions(list => list.filter(r => r.id !== region.id))
    try {
      await deleteRegionalPricing(region.id)
    } catch (err) {
      setRegions(previous)
      setError(err.message || 'Failed to delete regional pricing')
    }
  }

  const term = search.trim().toLowerCase()
  const visibleRegions = regions.filter(region =>
    !term ||
    zoneName(region).toLowerCase().includes(term) ||
    String(zoneCity(region)).toLowerCase().includes(term),
  )

  const formatPrice = (value) =>
    Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const unpricedZones = zones.length - regions.length

  return (
    <div className="regional-pricing">
      <header className="rp-header">
        <div>
          <h1 className="rp-title">Regional Pricing</h1>
          <p className="rp-subtitle">Per-zone base price and commission overrides.</p>
        </div>
        <button
          className="rp-btn rp-btn--primary"
          onClick={() => navigate('/admin/pricing/regional/add')}
          disabled={loading || zones.length === 0 || unpricedZones <= 0}
        >
          <Plus size={18} />
          Add Region
        </button>
      </header>

      <div className="rp-toolbar">
        <div className="rp-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by zone or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="rp-count">
          {loading
            ? '—'
            : `${regions.length} of ${zones.length} zone${zones.length === 1 ? '' : 's'} configured`}
        </span>
      </div>

      {error && (
        <div className="rp-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="rp-state">
          <Loader2 size={32} className="spin" />
          <span>Loading regional pricing…</span>
        </div>
      ) : zones.length === 0 ? (
        <div className="rp-state">
          <MapPin size={32} />
          <h2>No zones yet</h2>
          <p>Regional pricing attaches to a zone, so create a zone first.</p>
          <button className="rp-btn rp-btn--primary" onClick={() => navigate('/admin/zones')}>
            Go to Zones
          </button>
        </div>
      ) : regions.length === 0 ? (
        <div className="rp-state">
          <MapPin size={32} />
          <h2>No regional pricing yet</h2>
          <p>Every zone currently uses the standard platform pricing.</p>
          <button className="rp-btn rp-btn--primary" onClick={() => navigate('/admin/pricing/regional/add')}>
            <Plus size={16} /> Add Region
          </button>
        </div>
      ) : visibleRegions.length === 0 ? (
        <div className="rp-state">
          <Search size={32} />
          <h2>No matches</h2>
          <p>No regions match “{search.trim()}”.</p>
        </div>
      ) : (
        <div className="rp-table-card">
          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>City</th>
                  <th>Base price</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visibleRegions.map(region => (
                  <tr key={region.id}>
                    <td>
                      <span className="rp-cell-name">
                        <MapPin size={15} />
                        {zoneName(region)}
                      </span>
                    </td>
                    <td className="rp-cell-muted">{zoneCity(region) || '—'}</td>
                    <td>
                      <span className="riyal-symbol">&#x20C1;</span>{formatPrice(region.base_price)}
                    </td>
                    <td>{Number(region.commission_percent ?? 0)}%</td>
                    <td>
                      <span className={`rp-badge ${region.is_active !== false ? 'is-active' : 'is-inactive'}`}>
                        {region.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="rp-row-actions">
                        <button
                          className="rp-icon-btn"
                          onClick={() => navigate(`/admin/pricing/regional/${region.id}/edit`)}
                          title={`Edit ${zoneName(region)}`}
                          aria-label={`Edit ${zoneName(region)}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="rp-icon-btn rp-icon-btn--danger"
                          onClick={() => askDelete(region)}
                          title={`Delete ${zoneName(region)}`}
                          aria-label={`Delete ${zoneName(region)}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {unpricedZones > 0 && (
            <p className="rp-footnote">
              {unpricedZones} zone{unpricedZones === 1 ? '' : 's'} still use the standard platform pricing.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete regional pricing"
        message={confirm?.message}
        confirmLabel="Delete region"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const pending = confirm
          setConfirm(null)
          if (pending) handleDelete(pending.region)
        }}
      />
    </div>
  )
}

export default RegionalPricing
