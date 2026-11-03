import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, AlertTriangle, PackagePlus, Search,
} from 'lucide-react'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import {
  getServices,
  getServiceAddons,
  deleteServiceAddon,
} from '../../../api'
import './AddonsManagement.css'
import TableScroll from '../../../components/DataTable/TableScroll'
import Pager from '../../../components/DataTable/Pager'
import { usePagedRows } from '../../../components/DataTable/usePagedRows'
import { TableBlockShimmer } from '../../../components/Shimmer/Shimmer'


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

  const askDelete = (addon) => {
    setConfirm({
      addon,
      message: `Delete "${addon.name_en}"? This cannot be undone.`,
    })
  }

  const handleDelete = async (addon) => {
    const previous = addonsByService
    setAddonsByService(prev => {
      const next = {}
      for (const [serviceId, list] of Object.entries(prev)) {
        next[serviceId] = toArray(list).filter(item => item.id !== addon.id)
      }
      return next
    })
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

  const addons = services.flatMap(service =>
    toArray(addonsByService[service.id]).map(addon => ({
      ...addon,
      serviceId: addon.service_id || service.id,
    })),
  ).filter(matches)
  const { pageRows, pagerProps } = usePagedRows(addons, {
    defaultLimit: 10,
    resetKey: term,
  })

  const totalAddons = addons.length

  const formatPrice = (value) =>
    Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="addons-management">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">Title and one price. Tick an add-on on a service to show it there.</p>
        </div>
        <button
          className="dt-btn dt-btn--primary"
          onClick={() => navigate('/admin/services/addons/add')}
          disabled={services.length === 0}
        >
          <Plus size={18} />
          Add Add-on
        </button>
      </header>

      <div className="dt-toolbar">
        <div className="dt-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search add-ons…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="am-count">
          {loading ? '—' : `${totalAddons} add-on${totalAddons === 1 ? '' : 's'}`}
        </span>
      </div>

      {error && (
        <div className="am-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <TableBlockShimmer columns={5} />
      ) : services.length === 0 ? (
        <div className="dt-empty">
          <PackagePlus size={32} />
          <h2>No services yet</h2>
          <p>Create a service first, then add extras you can tick on that service.</p>
          <button className="dt-btn dt-btn--primary" onClick={() => navigate('/admin/services/add')}>
            <Plus size={16} /> Add Service
          </button>
        </div>
      ) : term && addons.length === 0 ? (
        <div className="dt-empty">
          <Search size={32} />
          <h2>No matches</h2>
          <p>No add-ons match “{search.trim()}”.</p>
        </div>
      ) : addons.length === 0 ? (
        <div className="dt-empty">
          <PackagePlus size={32} />
          <h2>No add-ons yet</h2>
          <p>Create one here. Open a service and tick it when that service should offer it.</p>
        </div>
      ) : (
        <section className="am-section">
          <TableScroll>
            <table className="dt-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map(addon => (
                  <tr key={addon.id}>
                    <td className="am-cell-name">{addon.name_en}</td>
                    <td>
                      <span className="riyal-symbol">&#x20C1;</span>{formatPrice(addon.price)}
                    </td>
                    <td>
                      <span className={`dt-status ${addon.is_active ? 'is-active' : 'is-inactive'}`}>
                        {addon.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="dt-row-actions">
                        <button
                          className="dt-icon-btn"
                          onClick={() => navigate(`/admin/services/addons/${addon.id}/edit`, {
                            state: { serviceId: addon.serviceId },
                          })}
                          title={`Edit ${addon.name_en}`}
                          aria-label={`Edit ${addon.name_en}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="dt-icon-btn dt-icon-btn--danger"
                          onClick={() => askDelete(addon)}
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
          </TableScroll>
        </section>
      )}
      {pageRows.length > 0 && (
        <div className="dt-pager-wrap">
          <Pager {...pagerProps} unit="add-ons" />
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
          if (pending) handleDelete(pending.addon)
        }}
      />
    </div>
  )
}

export default AddonsManagement
