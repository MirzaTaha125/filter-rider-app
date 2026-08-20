import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Loader2, AlertTriangle, Ruler, Search,
} from 'lucide-react'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import {
  getServices,
  getSizeCategories,
  getPricingMatrix,
  deletePricingMatrix,
} from '../../../api'
import './PricingMatrix.css'

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function PricingMatrix() {
  const navigate = useNavigate()

  const [services, setServices] = useState([])
  const [sizeNames, setSizeNames] = useState({})
  const [rowsByService, setRowsByService] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)

  const loadData = useCallback(async () => {
    setError('')
    try {
      const [svcs, sizes] = await Promise.all([
        getServices(null, true),
        getSizeCategories(),
      ])
      const serviceList = toArray(svcs)
      setServices(serviceList)
      setSizeNames(
        Object.fromEntries(toArray(sizes).map(s => [s.id, s.name])),
      )

      const results = await Promise.allSettled(
        serviceList.map(s => getPricingMatrix(s.id)),
      )
      setRowsByService(
        Object.fromEntries(
          serviceList.map((s, i) => [
            s.id,
            results[i].status === 'fulfilled' ? toArray(results[i].value) : [],
          ]),
        ),
      )
    } catch (err) {
      setError(err.message || 'Failed to load pricing matrix')
      setServices([])
      setRowsByService({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const sizeLabel = (row) =>
    row.size_category?.name ?? sizeNames[row.size_category_id] ?? row.size_category_id

  const askDelete = (row, service) => {
    setConfirm({
      row,
      message: `Delete the ${sizeLabel(row)} price for ${service.name_en}? This cannot be undone.`,
    })
  }

  const handleDelete = async (row) => {
    const previous = rowsByService
    setRowsByService(prev => ({
      ...prev,
      [row.service_id]: toArray(prev[row.service_id])
        .filter(r => r.size_category_id !== row.size_category_id),
    }))
    try {
      await deletePricingMatrix(row.service_id, row.size_category_id)
    } catch (err) {
      setRowsByService(previous)
      setError(err.message || 'Failed to delete pricing entry')
    }
  }

  const term = search.trim().toLowerCase()
  const matches = (row, service) =>
    !term ||
    (service.name_en || '').toLowerCase().includes(term) ||
    String(sizeLabel(row)).toLowerCase().includes(term)

  const visibleServices = services.filter(service => {
    if (!term) return true
    return toArray(rowsByService[service.id]).some(r => matches(r, service))
  })

  const totalRows = Object.values(rowsByService).reduce((n, list) => n + toArray(list).length, 0)

  const formatPrice = (value) =>
    Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="pricing-matrix">
      <header className="pm-header">
        <div>
          <h1 className="pm-title">Pricing Matrix</h1>
          <p className="pm-subtitle">Per-size pricing that overrides a service’s base price.</p>
        </div>
        <button
          className="pm-btn pm-btn--primary"
          onClick={() => navigate('/admin/services/pricing-matrix/add')}
          disabled={services.length === 0}
        >
          <Plus size={18} />
          Add New Pricing
        </button>
      </header>

      <div className="pm-toolbar">
        <div className="pm-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by service or size…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="pm-count">
          {loading ? '—' : `${totalRows} entr${totalRows === 1 ? 'y' : 'ies'} across ${services.length} service${services.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {error && (
        <div className="pm-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="pm-state">
          <Loader2 size={32} className="spin" />
          <span>Loading pricing matrix…</span>
        </div>
      ) : services.length === 0 ? (
        <div className="pm-state">
          <Ruler size={32} />
          <h2>No services yet</h2>
          <p>Pricing attaches to a service, so create a service first.</p>
          <button className="pm-btn pm-btn--primary" onClick={() => navigate('/admin/services/add')}>
            <Plus size={16} /> Add Service
          </button>
        </div>
      ) : visibleServices.length === 0 ? (
        <div className="pm-state">
          <Search size={32} />
          <h2>No matches</h2>
          <p>No pricing entries match “{search.trim()}”.</p>
        </div>
      ) : (
        <div className="pm-sections">
          {visibleServices.map(service => {
            const rows = toArray(rowsByService[service.id]).filter(r => matches(r, service))
            return (
              <section key={service.id} className="pm-section">
                <header className="pm-section-head">
                  <div>
                    <h2 className="pm-section-title">{service.name_en}</h2>
                    <p className="pm-section-meta">
                      {rows.length} price{rows.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button
                    className="pm-btn pm-btn--ghost"
                    onClick={() => navigate(`/admin/services/pricing-matrix/add?serviceId=${service.id}`)}
                  >
                    <Plus size={15} /> Add
                  </button>
                </header>

                {rows.length === 0 ? (
                  <p className="pm-empty">No size-specific pricing for this service yet.</p>
                ) : (
                  <div className="pm-table-wrap">
                    <table className="pm-table">
                      <thead>
                        <tr>
                          <th>Size category</th>
                          <th>Base price</th>
                          <th>Duration</th>
                          <th>Status</th>
                          <th aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(row => (
                          <tr key={`${row.service_id}-${row.size_category_id}`}>
                            <td className="pm-cell-name">{sizeLabel(row)}</td>
                            <td>
                              <span className="riyal-symbol">&#x20C1;</span>{formatPrice(row.base_price)}
                            </td>
                            <td>{row.duration_min ?? 0} min</td>
                            <td>
                              <span className={`pm-badge ${row.status !== false ? 'is-active' : 'is-inactive'}`}>
                                {row.status !== false ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div className="pm-row-actions">
                                <button
                                  className="pm-icon-btn"
                                  onClick={() => navigate(
                                    `/admin/services/pricing-matrix/${row.service_id}/${row.size_category_id}/edit`,
                                  )}
                                  title={`Edit ${sizeLabel(row)} pricing`}
                                  aria-label={`Edit ${sizeLabel(row)} pricing`}
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  className="pm-icon-btn pm-icon-btn--danger"
                                  onClick={() => askDelete(row, service)}
                                  title={`Delete ${sizeLabel(row)} pricing`}
                                  aria-label={`Delete ${sizeLabel(row)} pricing`}
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
                )}
              </section>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete pricing entry"
        message={confirm?.message}
        confirmLabel="Delete entry"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const pending = confirm
          setConfirm(null)
          if (pending) handleDelete(pending.row)
        }}
      />
    </div>
  )
}

export default PricingMatrix
