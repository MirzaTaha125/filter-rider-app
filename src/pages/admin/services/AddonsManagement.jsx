import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Loader2, AlertTriangle, PackagePlus, Search,
} from 'lucide-react'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import {
  getServices,
  getServiceAddons,
  deleteServiceAddon,
} from '../../../api'
import './AddonsManagement.css'

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function AddonsManagement() {
  const navigate = useNavigate()

  const [services, setServices] = useState([])
  const [addonsByService, setAddonsByService] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)

  const loadData = useCallback(async () => {
    setError('')
    try {
      const serviceList = toArray(await getServices(null, true))
      setServices(serviceList)

      const results = await Promise.allSettled(
        serviceList.map(s => getServiceAddons(s.id, true)),
      )
      setAddonsByService(
        Object.fromEntries(
          serviceList.map((s, i) => [
            s.id,
            results[i].status === 'fulfilled' ? toArray(results[i].value) : [],
          ]),
        ),
      )
    } catch (err) {
      setError(err.message || 'Failed to load add-ons')
      setServices([])
      setAddonsByService({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const askDelete = (addon, service) => {
    setConfirm({
      addon,
      serviceId: service.id,
      message: `Delete "${addon.name_en}" from ${service.name_en}? This cannot be undone.`,
    })
  }

  const handleDelete = async (addon, serviceId) => {
    const previous = addonsByService
    setAddonsByService(prev => ({
      ...prev,
      [serviceId]: toArray(prev[serviceId]).filter(a => a.id !== addon.id),
    }))
    try {
      await deleteServiceAddon(addon.id)
    } catch (err) {
      setAddonsByService(previous)
      setError(err.message || 'Failed to delete add-on')
    }
  }

  const term = search.trim().toLowerCase()
  const matches = (addon) =>
    !term ||
    (addon.name_en || '').toLowerCase().includes(term) ||
    (addon.name_ar || '').toLowerCase().includes(term)

  // When searching, hide services that have nothing left to show.
  const visibleServices = services.filter(service => {
    if (!term) return true
    return toArray(addonsByService[service.id]).some(matches)
  })

  const totalAddons = Object.values(addonsByService).reduce((n, list) => n + toArray(list).length, 0)

  const formatPrice = (value) =>
    Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="addons-management">
      <header className="am-header">
        <div>
          <h1 className="am-title">Service Add-ons</h1>
          <p className="am-subtitle">Optional extras customers can add to a service when booking.</p>
        </div>
        <button
          className="am-btn am-btn--primary"
          onClick={() => navigate('/admin/services/addons/add')}
          disabled={services.length === 0}
        >
          <Plus size={18} />
          Add Add-on
        </button>
      </header>

      <div className="am-toolbar">
        <div className="am-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search add-ons…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="am-count">
          {loading ? '—' : `${totalAddons} add-on${totalAddons === 1 ? '' : 's'} across ${services.length} service${services.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {error && (
        <div className="am-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="am-state">
          <Loader2 size={32} className="spin" />
          <span>Loading add-ons…</span>
        </div>
      ) : services.length === 0 ? (
        <div className="am-state">
          <PackagePlus size={32} />
          <h2>No services yet</h2>
          <p>Add-ons attach to a service, so create a service first.</p>
          <button className="am-btn am-btn--primary" onClick={() => navigate('/admin/services/add')}>
            <Plus size={16} /> Add Service
          </button>
        </div>
      ) : visibleServices.length === 0 ? (
        <div className="am-state">
          <Search size={32} />
          <h2>No matches</h2>
          <p>No add-ons match “{search.trim()}”.</p>
        </div>
      ) : (
        <div className="am-sections">
          {visibleServices.map(service => {
            const addons = toArray(addonsByService[service.id]).filter(matches)
            return (
              <section key={service.id} className="am-section">
                <header className="am-section-head">
                  <div>
                    <h2 className="am-section-title">{service.name_en}</h2>
                    <p className="am-section-meta">
                      {addons.length} add-on{addons.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button
                    className="am-btn am-btn--ghost"
                    onClick={() => navigate(`/admin/services/addons/add?serviceId=${service.id}`)}
                  >
                    <Plus size={15} /> Add
                  </button>
                </header>

                {addons.length === 0 ? (
                  <p className="am-empty">No add-ons for this service yet.</p>
                ) : (
                  <div className="am-table-wrap">
                    <table className="am-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Arabic</th>
                          <th>Price</th>
                          <th>Extra time</th>
                          <th>Status</th>
                          <th aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {addons.map(addon => (
                          <tr key={addon.id}>
                            <td className="am-cell-name">{addon.name_en}</td>
                            <td dir="rtl" className="am-cell-ar">{addon.name_ar || '—'}</td>
                            <td>
                              <span className="riyal-symbol">&#x20C1;</span>{formatPrice(addon.price)}
                            </td>
                            <td>{addon.additional_duration ?? 0} min</td>
                            <td>
                              <span className={`am-badge ${addon.is_active ? 'is-active' : 'is-inactive'}`}>
                                {addon.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div className="am-row-actions">
                                <button
                                  className="am-icon-btn"
                                  onClick={() => navigate(`/admin/services/addons/${addon.id}/edit`, {
                                    state: { serviceId: service.id },
                                  })}
                                  title={`Edit ${addon.name_en}`}
                                  aria-label={`Edit ${addon.name_en}`}
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  className="am-icon-btn am-icon-btn--danger"
                                  onClick={() => askDelete(addon, service)}
                                  title={`Delete ${addon.name_en}`}
                                  aria-label={`Delete ${addon.name_en}`}
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
        title="Delete add-on"
        message={confirm?.message}
        confirmLabel="Delete add-on"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const pending = confirm
          setConfirm(null)
          if (pending) handleDelete(pending.addon, pending.serviceId)
        }}
      />
    </div>
  )
}

export default AddonsManagement
