import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2, AlertTriangle, Plus, Trash2, Star, Calendar, ChevronRight,
  Phone, MapPin, CheckCircle, FileText, Briefcase, Shield, FileCheck,
} from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import StatTile from '../../../components/StatTile/StatTile'
import SortableTh from '../../../components/DataTable/SortableTh'
import { useTableSort } from '../../../components/DataTable/useTableSort'
import { normalizeStatus, orderStatusTone } from '../orders/orderStatus'
import {
  getProviderDetails, updateProviderStatus,
  assignProviderServices, removeProviderService, getServices,
} from '../../../api'
import { getAdminOrders } from '../../../api/orders.js'
import { flattenDocs } from '../../../utils/spDocuments'
import {
  titleCase, statusTone, availabilityTone, normalizeAvailability,
  zoneLabel, initials, formatMoney, formatDate,
} from './providers.js'
import '../adminForm.css'
import './ServiceProviderDetail.css'
import TableScroll from '../../../components/DataTable/TableScroll'

// Documents moved into the rail — they are a checklist you glance at, not a
// place you go. Performance became the order table it always was.
const TABS = [
  { id: 'orders', label: 'Orders' },
  { id: 'services', label: 'Services' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'settings', label: 'Settings' },
]

/** One labelled fact in the identity rail. */
function Fact({ icon: Icon, label, children }) {
  return (
    <div className="spd-fact">
      <span className="spd-fact-label">{label}</span>
      <span className="spd-fact-value">
        {Icon && <Icon size={14} />}
        <span>{children}</span>
      </span>
    </div>
  )
}

const DOCUMENTS = [
  { key: 'governmentId', label: 'Government ID', Icon: FileText },
  { key: 'certification', label: 'Certification', Icon: FileCheck },
  { key: 'insurance', label: 'Insurance', Icon: Shield },
  { key: 'businessLicense', label: 'Business license', Icon: Briefcase },
]

const CLOSED_STATUSES = ['COMPLETED', 'CANCELLED']

function toArray(value) {
  if (Array.isArray(value)) return value
  return value?.orders ?? value?.items ?? value?.data ?? []
}

function ServiceProviderDetail() {
  const { providerId } = useParams()
  const navigate = useNavigate()

  const [provider, setProvider] = useState(null)
  const [orders, setOrders] = useState([])
  const [allServices, setAllServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [tab, setTab] = useState('orders')
  const [orderFilter, setOrderFilter] = useState('all')
  const [avatarBroken, setAvatarBroken] = useState(false)
  const sort = useTableSort('date', 'desc')

  const [addingService, setAddingService] = useState(false)
  const [serviceToAdd, setServiceToAdd] = useState('')
  const [servicesBusy, setServicesBusy] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const raw = await getProviderDetails(providerId)
      if (!raw?.id && !raw?.user) {
        setLoadError('Service provider not found')
        return
      }
      setProvider({
        id: providerId,
        name: raw.user?.full_name ?? '—',
        email: raw.user?.email ?? '—',
        phone: raw.user?.phone ?? '—',
        avatar: raw.user?.avatar ?? null,
        status: raw.status ?? raw.provider_status ?? 'ACTIVE',
        availability: normalizeAvailability(
          raw.availability ?? raw.liveStatus ?? raw.live_status,
        ),
        verified: raw.verification_status === 'VERIFIED',
        zone: zoneLabel(raw.zone),
        bio: raw.profile?.bio ?? '',
        joinDate: raw.created_at ?? null,
        // ProviderStats stores avg_rating; `stats.rating` never existed, so
        // every provider used to read 0.0 stars.
        rating: Number(raw.rating ?? raw.stats?.avg_rating ?? 0),
        ratingCount: raw.rating_count ?? raw.stats?.rating_count ?? 0,
        wallet: raw.wallet ?? null,
        services: raw.services ?? [],
        bankAccounts: raw.bank_accounts ?? [],
        ...flattenDocs(raw),
      })
    } catch (err) {
      setLoadError(err.message || 'Failed to load service provider')
    } finally {
      setLoading(false)
    }
  }, [providerId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    getServices(null, true).then(list => setAllServices(toArray(list))).catch(() => {})
  }, [])

  // Orders are now filtered server-side by provider.
  useEffect(() => {
    let cancelled = false
    setOrdersLoading(true)
    getAdminOrders({ providerId, limit: 100 })
      .then(data => { if (!cancelled) setOrders(toArray(data)) })
      .catch(() => { if (!cancelled) setOrders([]) })
      .finally(() => { if (!cancelled) setOrdersLoading(false) })
    return () => { cancelled = true }
  }, [providerId])

  const refreshServices = async () => {
    const refreshed = await getProviderDetails(providerId)
    setProvider(prev => (prev ? { ...prev, services: refreshed.services ?? [] } : prev))
  }

  const handleAddService = async () => {
    if (!serviceToAdd) return
    setServicesBusy(true)
    setActionError('')
    try {
      await assignProviderServices(providerId, [serviceToAdd])
      await refreshServices()
      setServiceToAdd('')
      setAddingService(false)
    } catch (err) {
      setActionError(err.message || 'Failed to add service')
    } finally {
      setServicesBusy(false)
    }
  }

  const handleRemoveService = async (serviceId) => {
    const previous = provider?.services ?? []
    setServicesBusy(true)
    setActionError('')
    setProvider(prev => (prev ? {
      ...prev,
      services: (prev.services ?? []).filter(
        it => (it.service?.id ?? it.service_id ?? it.id) !== serviceId,
      ),
    } : prev))
    try {
      await removeProviderService(providerId, serviceId)
    } catch (err) {
      setProvider(prev => (prev ? { ...prev, services: previous } : prev))
      setActionError(err.message || 'Failed to remove service')
    } finally {
      setServicesBusy(false)
    }
  }

  const handleStatusChange = async (nextStatus) => {
    setStatusBusy(true)
    setActionError('')
    const previous = provider.status
    setProvider(prev => ({ ...prev, status: nextStatus }))
    try {
      await updateProviderStatus(providerId, nextStatus)
    } catch (err) {
      setProvider(prev => ({ ...prev, status: previous }))
      setActionError(err.message || 'Failed to update status')
    } finally {
      setStatusBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="sp-detail-page">
        <PageHeader title="Service Provider" />
        <div className="sf-state"><Loader2 size={32} className="spin" /><span>Loading…</span></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="sp-detail-page">
        <PageHeader title="Service Provider" />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load provider</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate('/admin/service-providers')}>
            Back to providers
          </button>
        </div>
      </div>
    )
  }

  const activeOrders = orders.filter(o => !CLOSED_STATUSES.includes(String(o.status).toUpperCase()))
  const completedOrders = orders.filter(o => String(o.status).toUpperCase() === 'COMPLETED')
  const earned = completedOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0)

  const assignedIds = new Set(
    (provider.services ?? []).map(it => it.service?.id ?? it.service_id ?? it.id),
  )
  const availableServices = allServices.filter(s => !assignedIds.has(s.id))
  const isDeactivated = ['INACTIVE', 'SUSPENDED'].includes(String(provider.status).toUpperCase())

  const shownOrders = orderFilter === 'active'
    ? activeOrders
    : orderFilter === 'completed'
      ? completedOrders
      : orders

  const sortedOrders = sort.apply(shownOrders, {
    order_no: (o) => o.order_no ?? o.id,
    service: (o) => o.service?.name_en ?? '',
    customer: (o) => o.customer?.user?.full_name ?? o.customer?.profile?.company_name ?? '',
    amount: (o) => Number(o.total_price ?? 0),
    date: (o) => new Date(o.created_at ?? 0).getTime(),
    status: (o) => normalizeStatus(o.status),
  })

  return (
    <div className="sp-detail-page">
      <PageHeader title={provider.name} subtitle={provider.phone} />

      {actionError && (
        <div className="sf-alert">
          <AlertTriangle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      <div className="stat-tile-row">
        <StatTile
          label="Total orders"
          value={ordersLoading ? null : orders.length}
          hint={`${completedOrders.length} completed · ${activeOrders.length} active`}
        />
        <StatTile
          label="Average rating"
          value={ordersLoading ? provider.rating : provider.rating}
          hint={provider.ratingCount > 0
            ? `from ${provider.ratingCount} rating${provider.ratingCount === 1 ? '' : 's'}`
            : 'no ratings yet'}
        />
        <StatTile
          label="Earned"
          value={ordersLoading ? null : earned}
          money
          hint={`from ${completedOrders.length} completed`}
        />
        <StatTile
          label="Wallet balance"
          value={Number(provider.wallet?.available_balance ?? 0)}
          money
          hint="Available now"
        />
      </div>

      <div className="spd-layout">
        {/* ── Identity rail ───────────────────────────────────────────────── */}
        <aside className="spd-rail">
          <section className="spd-card spd-identity">
            <span className="spd-avatar">
              {provider.avatar && !avatarBroken
                ? <img src={provider.avatar} alt="" onError={() => setAvatarBroken(true)} />
                : initials(provider.name)}
              <span className={`spd-presence ${provider.availability === 'ONLINE' ? 'is-online' : ''}`} />
            </span>

            <h2 className="spd-name">
              {provider.name}
              {provider.verified && (
                <span className="spd-verified" title="Verified"><CheckCircle size={14} /></span>
              )}
            </h2>

            <div className="spd-tags">
              <span className={`dt-status dt-status--${statusTone(provider.status)}`}>
                {titleCase(provider.status)}
              </span>
              <span className={`dt-dot-label dt-tone--${availabilityTone(provider.availability)}`}>
                <span className="dt-dot" />
                {titleCase(provider.availability)}
              </span>
            </div>

            <div className="spd-stars-row">
              {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} size={14} className={n <= Math.round(provider.rating) ? 'is-filled' : ''} />
              ))}
              <em>{Number(provider.rating).toFixed(1)}</em>
            </div>

            {provider.bio && <p className="spd-bio">{provider.bio}</p>}

            <div className="spd-facts">
              <Fact icon={Phone} label="Phone">{provider.phone}</Fact>
              <Fact icon={MapPin} label="Zone">{provider.zone}</Fact>
              <Fact icon={Calendar} label="Joined">
                {provider.joinDate ? formatDate(provider.joinDate) : '—'}
              </Fact>
            </div>
          </section>

          <section className="spd-card">
            <h3 className="spd-card-title">Documents</h3>
            <ul className="spd-docs">
              {DOCUMENTS.map((doc) => {
                const Icon = doc.Icon
                const { key, label } = doc
                const url = provider[key]
                return (
                  <li key={key} className="spd-doc">
                    <span className="spd-doc-icon"><Icon size={15} /></span>
                    <span className="spd-doc-label">{label}</span>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="spd-doc-link">
                        View
                      </a>
                    ) : (
                      <span className="spd-doc-missing">Missing</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        </aside>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="spd-main">
          <div className="spd-tabs" role="tablist">
            {TABS.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`spd-tab ${tab === t.id ? 'is-active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.id === 'services' && provider.services?.length > 0 && (
                  <span className="spd-tab-count">{provider.services.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="spd-panel">
            {/* ORDERS */}
            {tab === 'orders' && (
              ordersLoading ? (
                <div className="dt-state">Loading orders…</div>
              ) : (
                <>
                  {/* One table with a filter beats two stacked tables — the
                      columns are identical and sorting works across the lot. */}
                  <div className="dt-toolbar">
                    <div className="spd-filters">
                      {[
                        ['all', `All (${orders.length})`],
                        ['active', `Active (${activeOrders.length})`],
                        ['completed', `Completed (${completedOrders.length})`],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          className={`spd-chip ${orderFilter === value ? 'is-active' : ''}`}
                          onClick={() => setOrderFilter(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <TableScroll>
                    <table className="dt-table" style={{ minWidth: 780 }}>
                      <thead>
                        <tr>
                          <SortableTh sortKey="order_no" sort={sort}>Order</SortableTh>
                          <SortableTh sortKey="service" sort={sort}>Service</SortableTh>
                          <SortableTh sortKey="customer" sort={sort}>Customer</SortableTh>
                          <SortableTh sortKey="date" sort={sort}>Date</SortableTh>
                          <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
                          <SortableTh sortKey="amount" sort={sort}>Amount</SortableTh>
                          <th className="dt-col-actions" aria-label="Open" />
                        </tr>
                      </thead>
                      <tbody>
                        {sortedOrders.length === 0 ? (
                          <tr><td colSpan="7" className="dt-state">No orders in this view.</td></tr>
                        ) : sortedOrders.map(order => {
                          const status = normalizeStatus(order.status)
                          return (
                            <tr
                              key={order.id}
                              className="is-clickable"
                              onClick={() => navigate(`/admin/orders/${order.id}`)}
                            >
                              <td><strong>{order.order_no ?? `#${order.id?.slice(0, 8)}`}</strong></td>
                              <td>{order.service?.name_en ?? '—'}</td>
                              <td className="dt-muted">
                                {order.customer?.user?.full_name
                                  ?? order.customer?.profile?.company_name
                                  ?? '—'}
                              </td>
                              <td className="dt-muted">{formatDate(order.created_at)}</td>
                              <td>
                                <span className={`dt-status dt-status--${orderStatusTone(status)}`}>
                                  {status.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td>
                                <strong>
                                  <span className="riyal-symbol">&#x20C1;</span>{formatMoney(order.total_price)}
                                </strong>
                              </td>
                              <td className="dt-col-actions">
                                <ChevronRight size={16} className="dt-muted" />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </TableScroll>
                </>
              )
            )}

            {/* SERVICES */}
            {tab === 'services' && (
              <>
                <div className="spd-panel-head">
                  <div>
                    <h3 className="spd-card-title">Assigned services</h3>
                    <p className="spd-panel-sub">Which services this provider is allowed to take.</p>
                  </div>
                  {!addingService ? (
                    <button
                      className="dt-btn dt-btn--primary"
                      onClick={() => setAddingService(true)}
                      disabled={servicesBusy || availableServices.length === 0}
                      title={availableServices.length === 0 ? 'Every service is already assigned' : undefined}
                    >
                      <Plus size={15} /> Add service
                    </button>
                  ) : (
                    <div className="spd-add-row">
                      <select
                        className="dt-field"
                        value={serviceToAdd}
                        onChange={(e) => setServiceToAdd(e.target.value)}
                        disabled={servicesBusy}
                        aria-label="Service to add"
                      >
                        <option value="">Select a service…</option>
                        {availableServices.map(s => (
                          <option key={s.id} value={s.id}>{s.name_en}</option>
                        ))}
                      </select>
                      <button
                        className="dt-btn dt-btn--primary"
                        onClick={handleAddService}
                        disabled={!serviceToAdd || servicesBusy}
                      >
                        {servicesBusy ? <Loader2 size={15} className="spin" /> : 'Add'}
                      </button>
                      <button
                        className="dt-btn"
                        onClick={() => { setAddingService(false); setServiceToAdd('') }}
                        disabled={servicesBusy}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {(provider.services ?? []).length === 0 ? (
                  <p className="spd-empty">No services assigned yet.</p>
                ) : (
                  <ul className="spd-services">
                    {provider.services.map(item => {
                      const svc = item.service ?? item
                      const id = svc.id ?? item.service_id
                      return (
                        <li key={id} className="spd-service">
                          <span
                            className="spd-service-icon"
                            style={{ '--accent': svc.icon_color || 'var(--text-muted)' }}
                          >
                            <Briefcase size={16} />
                          </span>
                          <span className="spd-service-name">
                            <strong>{svc.name_en ?? '—'}</strong>
                            {/* name_ar is often filled in with the English name,
                                so only show it when it differs. */}
                            {svc.name_ar && svc.name_ar.trim() !== (svc.name_en ?? '').trim() && (
                              <em dir="rtl">{svc.name_ar}</em>
                            )}
                          </span>
                          <span className="spd-service-meta">
                            {svc.base_price != null && (
                              <span><span className="riyal-symbol">&#x20C1;</span>{formatMoney(svc.base_price)}</span>
                            )}
                            {svc.duration_min != null && <span>{svc.duration_min} min</span>}
                          </span>
                          <span className={`dt-status dt-status--${item.is_active ? 'success' : 'muted'}`}>
                            {item.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            className="dt-icon-btn dt-icon-btn--danger"
                            onClick={() => setConfirm({
                              serviceId: id,
                              message: `Remove "${svc.name_en}" from ${provider.name}? They will stop receiving orders for it.`,
                            })}
                            disabled={servicesBusy}
                            title="Remove service"
                            aria-label={`Remove ${svc.name_en}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </>
            )}

            {/* WALLET */}
            {tab === 'wallet' && (
              <div className="spd-stack">
                <div className="spd-breakdown">
                  {[
                    ['Available balance', provider.wallet?.available_balance],
                    ['Locked balance', provider.wallet?.locked_balance],
                    ['Total credited', provider.wallet?.total_credited],
                    ['Total debited', provider.wallet?.total_debited],
                  ].map(([label, value]) => (
                    <div key={label} className="spd-line">
                      <span>{label}</span>
                      <strong><span className="riyal-symbol">&#x20C1;</span>{formatMoney(value)}</strong>
                    </div>
                  ))}
                  <div className="spd-line">
                    <span>Currency</span>
                    <strong>{provider.wallet?.currency ?? 'SAR'}</strong>
                  </div>
                  <div className="spd-line">
                    <span>Wallet status</span>
                    <strong>
                      <span className={`dt-status dt-status--${provider.wallet?.status === 'ACTIVE' ? 'success' : 'muted'}`}>
                        {provider.wallet?.status ?? '—'}
                      </span>
                    </strong>
                  </div>
                </div>

                <div>
                  <h3 className="spd-card-title">Bank accounts</h3>
                  {(provider.bankAccounts ?? []).length === 0 ? (
                    <p className="spd-empty">No bank account on file.</p>
                  ) : (
                    <ul className="spd-banks">
                      {provider.bankAccounts.map(acc => (
                        <li key={acc.id ?? acc.iban} className="spd-bank">
                          <strong>{acc.bank_name ?? 'Bank'}</strong>
                          <span>{acc.account_holder_name}</span>
                          {acc.iban && <em>{acc.iban}</em>}
                          {acc.is_default && <span className="dt-status dt-status--success">Default</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* SETTINGS */}
            {tab === 'settings' && (
              <>
                <h3 className="spd-card-title">Account status</h3>
                <p className="spd-panel-sub">
                  Controls whether this provider can sign in and receive new orders.
                </p>

                <label className="sf-toggle">
                  <input
                    type="checkbox"
                    checked={!isDeactivated}
                    onChange={(e) => handleStatusChange(e.target.checked ? 'ACTIVE' : 'INACTIVE')}
                    disabled={statusBusy}
                  />
                  <span className="sf-toggle-track"><span className="sf-toggle-thumb" /></span>
                  <span className="sf-toggle-copy">
                    <strong>{statusBusy ? 'Saving…' : isDeactivated ? 'Deactivated' : 'Active'}</strong>
                    <em>
                      {isDeactivated
                        ? 'This provider cannot access the platform or receive orders.'
                        : 'This provider can sign in and receive new orders.'}
                    </em>
                  </span>
                </label>

                {String(provider.status).toUpperCase() === 'SUSPENDED' && (
                  <div className="spd-note">
                    <AlertTriangle size={15} />
                    <span>
                      This account is <strong>suspended</strong>. Turning the toggle on will set it back to Active.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Remove service"
        message={confirm?.message}
        confirmLabel="Remove service"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const pending = confirm
          setConfirm(null)
          if (pending) handleRemoveService(pending.serviceId)
        }}
      />
    </div>
  )
}

export default ServiceProviderDetail
