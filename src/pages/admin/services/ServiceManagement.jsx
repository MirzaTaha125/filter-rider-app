import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../../contexts/SocketContext'
import {
  Plus, Pencil, Settings, Trash2, Wrench, AlertTriangle, Loader2, Search,
} from 'lucide-react'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import {
  getServices,
  getServiceCategories,
  getServiceAddons,
  deleteService,
} from '../../../api'
import { resolveServiceIcon } from './serviceIcons'
import './ServiceManagement.css'

const CATALOG_EVENTS = [
  'catalog.service.created', 'catalog.service.updated', 'catalog.service.toggled',
  'catalog.category.created', 'catalog.category.updated', 'catalog.category.toggled',
]

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function ServiceManagement() {
  const navigate = useNavigate()
  const { catalogSocket } = useSocket()

  const [services, setServices] = useState([])
  const [categories, setCategories] = useState({})
  const [addonCounts, setAddonCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [confirm, setConfirm] = useState(null)

  const loadData = useCallback(async () => {
    setError('')
    try {
      const [svcs, cats] = await Promise.all([
        getServices(null, true),
        getServiceCategories(true),
      ])

      const serviceList = toArray(svcs)
      setServices(serviceList)
      setCategories(
        Object.fromEntries(toArray(cats).map(c => [c.id, c.title_en || c.title_ar || 'Uncategorised'])),
      )

      // Add-on counts come from a separate endpoint — fetch them in parallel and
      // fold them in once available so the cards render without waiting.
      const results = await Promise.allSettled(
        serviceList.map(s => getServiceAddons(s.id, true)),
      )
      setAddonCounts(
        Object.fromEntries(
          serviceList.map((s, i) => [
            s.id,
            results[i].status === 'fulfilled' ? toArray(results[i].value).length : 0,
          ]),
        ),
      )
    } catch (err) {
      setError(err.message || 'Failed to load services')
      setServices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!catalogSocket) return
    const handler = () => loadData()
    CATALOG_EVENTS.forEach(ev => catalogSocket.on(ev, handler))
    return () => CATALOG_EVENTS.forEach(ev => catalogSocket.off(ev, handler))
  }, [catalogSocket, loadData])

  const askDelete = (service) => {
    setConfirm({
      service,
      message: `Delete "${service.name_en}"? This cannot be undone, and it will fail if the service is already used by orders.`,
    })
  }

  const handleDelete = async (service) => {
    const previous = services
    setServices(list => list.filter(s => s.id !== service.id))
    try {
      await deleteService(service.id)
    } catch (err) {
      setServices(previous)
      setError(err.message || 'Failed to delete service')
    }
  }

  const visibleServices = services.filter(service => {
    const matchesCategory = categoryFilter === 'all' || service.category_id === categoryFilter
    const term = search.trim().toLowerCase()
    const matchesSearch =
      !term ||
      (service.name_en || '').toLowerCase().includes(term) ||
      (service.name_ar || '').toLowerCase().includes(term)
    return matchesCategory && matchesSearch
  })

  const formatPrice = (value) =>
    Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="service-management">
      <header className="sm-header">
        <div>
          <h1 className="sm-title">Services</h1>
          <p className="sm-subtitle">Manage the service catalog, pricing, and configuration.</p>
        </div>
        <button className="sm-btn sm-btn--primary" onClick={() => navigate('/admin/services/add')}>
          <Plus size={18} />
          Add Service
        </button>
      </header>

      <div className="sm-toolbar">
        <div className="sm-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="sm-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All categories</option>
          {Object.entries(categories).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <span className="sm-count">
          {loading ? '—' : `${visibleServices.length} of ${services.length}`}
        </span>
      </div>

      {error && (
        <div className="sm-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="sm-state">
          <Loader2 size={32} className="spin" />
          <span>Loading services…</span>
        </div>
      ) : visibleServices.length === 0 ? (
        <div className="sm-state">
          <Wrench size={32} />
          <h2>{services.length === 0 ? 'No services yet' : 'No matches'}</h2>
          <p>
            {services.length === 0
              ? 'Create your first service to start taking bookings.'
              : 'Try a different search term or category.'}
          </p>
          {services.length === 0 && (
            <button className="sm-btn sm-btn--primary" onClick={() => navigate('/admin/services/add')}>
              <Plus size={16} /> Add Service
            </button>
          )}
        </div>
      ) : (
        <div className="sm-grid">
          {visibleServices.map(service => {
            const accent = service.icon_color || 'var(--primary-color)'
            const Icon = resolveServiceIcon(service.icon)
            return (
              <article key={service.id} className="sm-card" style={{ '--accent': accent }}>
                <div className="sm-card-top">
                  <span className="sm-card-icon"><Icon size={20} /></span>
                  <span className={`sm-badge ${service.is_active ? 'is-active' : 'is-inactive'}`}>
                    {service.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="sm-card-body">
                  <h2 className="sm-card-title">{service.name_en}</h2>
                  {service.name_ar && <p className="sm-card-subtitle" dir="rtl">{service.name_ar}</p>}
                  <span className="sm-card-category">
                    {categories[service.category_id] || 'Uncategorised'}
                  </span>

                  <dl className="sm-stats">
                    <div>
                      <dt>Base price</dt>
                      <dd><span className="riyal-symbol">&#x20C1;</span>{formatPrice(service.base_price)}</dd>
                    </div>
                    <div>
                      <dt>Duration</dt>
                      <dd>{service.duration_min ?? 0} min</dd>
                    </div>
                    <div>
                      <dt>Add-ons</dt>
                      <dd>{addonCounts[service.id] ?? '—'}</dd>
                    </div>
                  </dl>
                </div>

                <footer className="sm-card-actions">
                  <button
                    className="sm-btn sm-btn--ghost"
                    onClick={() => navigate(`/admin/services/${service.id}/edit`)}
                  >
                    <Pencil size={15} /> Edit
                  </button>
                  <button
                    className="sm-btn sm-btn--ghost"
                    onClick={() => navigate(`/admin/services/${service.id}/settings`)}
                  >
                    <Settings size={15} /> Settings
                  </button>
                  <button
                    className="sm-btn sm-btn--icon-danger"
                    onClick={() => askDelete(service)}
                    title={`Delete ${service.name_en}`}
                    aria-label={`Delete ${service.name_en}`}
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
        title="Delete service"
        message={confirm?.message}
        confirmLabel="Delete service"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const service = confirm?.service
          setConfirm(null)
          if (service) handleDelete(service)
        }}
      />
    </div>
  )
}

export default ServiceManagement
