import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../../contexts/SocketContext'
import {
  Plus, Wrench, AlertTriangle, Search, CheckCircle2, ImageOff,
} from 'lucide-react'
import MasterCatalogPicker, { FromMasterCatalogButton } from '../catalog/MasterCatalogPicker'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import {
  getServices,
  getServiceCategories,
  getServiceAddons,
  getServiceSizePrices,
  updateService,
} from '../../../api'
import './ServiceManagement.css'
import Pager from '../../../components/DataTable/Pager'
import { usePagedRows } from '../../../components/DataTable/usePagedRows'
import { ServiceCardsShimmer, ShimmerImage } from '../../../components/Shimmer/Shimmer'


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
  const [sizePrices, setSizePrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [confirm, setConfirm] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [notice, setNotice] = useState('')

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
      const [addonResults, sizeResults] = await Promise.all([
        Promise.allSettled(serviceList.map(s => getServiceAddons(s.id, true))),
        Promise.allSettled(serviceList.map(s => getServiceSizePrices(s.id))),
      ])
      setAddonCounts(
        Object.fromEntries(
          serviceList.map((s, i) => [
            s.id,
            addonResults[i].status === 'fulfilled'
              ? toArray(addonResults[i].value).filter(addon => addon.is_active !== false).length
              : 0,
          ]),
        ),
      )
      setSizePrices(
        Object.fromEntries(
          serviceList.map((s, i) => [
            s.id,
            sizeResults[i].status === 'fulfilled'
              ? toArray(sizeResults[i].value).filter(row => row.price != null && row.price !== '' && row.price_active !== false)
              : [],
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

  const setActive = async (service, isActive) => {
    setBusyId(service.id)
    setError('')
    try {
      await updateService(service.id, { isActive })
      setServices(list => list.map(s => (s.id === service.id ? { ...s, is_active: isActive } : s)))
    } catch (err) {
      setError(err.message || 'Failed to change the service status')
    } finally {
      setBusyId(null)
    }
  }

  // Deactivating stops new bookings, so it asks first; activating doesn't.
  const handleStatusClick = (service) => {
    if (service.is_active) setConfirm({ service })
    else setActive(service, true)
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
  const { pageRows, pagerProps } = usePagedRows(visibleServices, {
    defaultLimit: 20,
    resetKey: `${categoryFilter}|${search.trim()}`,
  })

  const formatPrice = (value) =>
    Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const sizeRowDisplay = (row) => {
    const list = Number(row.price ?? 0)
    const discounted =
      row.discounted_price == null || row.discounted_price === ''
        ? null
        : Number(row.discounted_price)
    const onSale =
      discounted != null && Number.isFinite(discounted) && discounted > 0 && discounted < list
    return {
      pay: onSale ? discounted : list,
      compareAt: onSale ? list : null,
    }
  }

  return (
    <div className="service-management">
      <header className="sm-header">
        <div>
          <p className="sm-subtitle">Manage the service catalog, pricing, and configuration.</p>
        </div>
        <div className="mcp-head-actions">
          <FromMasterCatalogButton label="Add Service from Master Catalog" onClick={() => setPickerOpen(true)} />
          <button className="sm-btn sm-btn--primary" onClick={() => navigate('/admin/services/add')}>
            <Plus size={18} />
            Add Service
          </button>
        </div>
      </header>

      {notice && (
        <div className="mcp-notice" role="status">
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}

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
        <ServiceCardsShimmer />
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
          {pageRows.map(service => {
            const accent = service.icon_color || 'var(--primary-color)'
            return (
              <article key={service.id} className="sm-card" style={{ '--accent': accent }}>
                {service.image_url ? (
                  <div className="sm-card-cover">
                    <ShimmerImage src={service.image_url} alt="" />
                  </div>
                ) : (
                  <div className="sm-card-cover sm-card-cover--empty">
                    <ImageOff size={22} />
                    <span>No image</span>
                  </div>
                )}
                <div className="sm-card-body">
                  <div className="sm-card-names">
                    <h2 className="sm-card-title">{service.name_en}</h2>
                    <span className={`sm-badge ${service.is_active ? 'is-active' : 'is-inactive'}`}>
                      {service.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="sm-card-meta">
                    <span className="sm-card-category">
                      {categories[service.category_id] || 'Uncategorised'}
                    </span>
                    <span className="sm-card-duration">{service.duration_min ?? 0} min</span>
                  </div>

                  <dl className="sm-stats">
                    {(sizePrices[service.id] ?? []).length === 0 ? (
                      <div>
                        <dt>Price</dt>
                        <dd>—</dd>
                      </div>
                    ) : (
                      sizePrices[service.id].map(row => {
                        const { pay, compareAt } = sizeRowDisplay(row)
                        return (
                          <div key={row.vehicle_size_id}>
                            <dt>{row.name}</dt>
                            <dd className="sm-price-dd">
                              {compareAt != null && (
                                <span className="sm-price-was">
                                  <span className="riyal-symbol">&#x20C1;</span>
                                  {formatPrice(compareAt)}
                                </span>
                              )}
                              <span className="sm-price-now">
                                <span className="riyal-symbol">&#x20C1;</span>
                                {formatPrice(pay)}
                              </span>
                            </dd>
                          </div>
                        )
                      })
                    )}
                    <div>
                      <dt>Add-ons</dt>
                      <dd>{addonCounts[service.id] ?? '—'}</dd>
                    </div>
                  </dl>
                </div>

                <footer className="sm-card-actions">
                  <button
                    className="sm-btn sm-btn--primary"
                    onClick={() => navigate(`/admin/services/${service.id}/edit`)}
                  >
                    Edit
                  </button>
                  <button
                    className={`sm-btn sm-btn--secondary sm-btn--status ${service.is_active ? 'is-deactivate' : 'is-activate'}`}
                    onClick={() => handleStatusClick(service)}
                    disabled={busyId === service.id}
                    aria-label={`${service.is_active ? 'Deactivate' : 'Activate'} ${service.name_en}`}
                  >
                    {service.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </footer>
              </article>
            )
          })}
        </div>
      )}
      {pageRows.length > 0 && (
        <div className="dt-pager-wrap">
          <Pager {...pagerProps} unit="services" />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Deactivate service"
        message={confirm ? `Deactivate "${confirm.service.name_en}"? Customers won't be able to book it until you activate it again. Past orders are not affected.` : ''}
        confirmLabel="Deactivate"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const service = confirm?.service
          setConfirm(null)
          if (service) setActive(service, false)
        }}
      />

      {pickerOpen && (
        <MasterCatalogPicker
          mode="service"
          riderCategories={Object.entries(categories).map(([id, name]) => ({ id, name }))}
          onClose={() => setPickerOpen(false)}
          onAdded={(res) => {
            const name = res?.service?.name_en ?? 'Service'
            setNotice(
              res?.created === false
                ? `${name} was already added.`
                : `${name} added${res?.category_created ? ` with the new category ${res?.category?.title_en}` : ''}.`,
            )
            loadData()
          }}
        />
      )}
    </div>
  )
}

export default ServiceManagement
