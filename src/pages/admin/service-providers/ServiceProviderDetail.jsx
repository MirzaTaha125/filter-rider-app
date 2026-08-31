import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2, AlertTriangle, Plus, Trash2, Star, ShoppingCart, Wallet,
  Phone, Mail, MapPin, CheckCircle, FileText, Briefcase, Shield, FileCheck,
} from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
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

const TABS = [
  { id: 'performance', label: 'Performance' },
  { id: 'services', label: 'Services' },
  { id: 'documents', label: 'Documents' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'settings', label: 'Settings' },
]

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
  const [tab, setTab] = useState('performance')

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
        availability: normalizeAvailability(raw.liveStatus ?? raw.live_status),
        verified: raw.verification_status === 'VERIFIED',
        zone: zoneLabel(raw.zone),
        bio: raw.profile?.bio ?? '',
        joinDate: raw.created_at ?? null,
        rating: raw.stats?.rating ?? 0,
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

  const orderRows = (rows, showAmount) => (
    <div className="spd-table-wrap">
      <table className="spd-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Service</th>
            <th>Customer</th>
            {showAmount && <th className="spd-num">Amount</th>}
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={showAmount ? 6 : 5} className="spd-empty-cell">Nothing here</td></tr>
          ) : rows.map(order => (
            <tr key={order.id}>
              <td className="spd-strong">{order.order_no ?? `#${order.id?.slice(0, 8)}`}</td>
              <td>{order.service?.name_en ?? '—'}</td>
              <td className="spd-muted">
                {order.customer?.user?.full_name ?? order.customer?.profile?.company_name ?? '—'}
              </td>
              {showAmount && (
                <td className="spd-num">
                  <span className="riyal-symbol">&#x20C1;</span>{formatMoney(order.total_price)}
                </td>
              )}
              <td className="spd-muted">{formatDate(order.created_at)}</td>
              <td>
                <span className="spd-order-status">{titleCase(String(order.status).replace(/_/g, ' '))}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="sp-detail-page">
      <PageHeader title={provider.name} subtitle="Service provider" />

      {actionError && (
        <div className="sf-alert">
          <AlertTriangle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      <section className="spd-profile">
        <span className="spd-avatar">
          {provider.avatar ? <img src={provider.avatar} alt="" /> : initials(provider.name)}
        </span>
        <div className="spd-profile-body">
          <h2 className="spd-name">
            {provider.name}
            {provider.verified && <span className="spd-verified"><CheckCircle size={13} /> Verified</span>}
          </h2>
          <div className="spd-meta">
            <span><Phone size={13} /> {provider.phone}</span>
            <span><Mail size={13} /> {provider.email}</span>
            <span><MapPin size={13} /> {provider.zone}</span>
            {provider.joinDate && <span>Joined {formatDate(provider.joinDate)}</span>}
          </div>
          {provider.bio && <p className="spd-bio">{provider.bio}</p>}
        </div>
        <div className="spd-profile-badges">
          <span className={`spm-badge spm-badge--${statusTone(provider.status)}`}>
            {titleCase(provider.status)}
          </span>
          <span className={`spm-avail spm-avail--${availabilityTone(provider.availability)}`}>
            <span className="spm-avail-dot" />
            {titleCase(provider.availability)}
          </span>
        </div>
      </section>

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

      {tab === 'performance' && (
        <div className="spd-stack">
          <div className="spd-metrics">
            <div className="spd-metric">
              <span className="spd-metric-icon"><ShoppingCart size={18} /></span>
              <span className="spd-metric-label">Total orders</span>
              <span className="spd-metric-value">{ordersLoading ? '—' : orders.length}</span>
              <span className="spd-metric-sub">
                {completedOrders.length} completed · {activeOrders.length} active
              </span>
            </div>
            <div className="spd-metric">
              <span className="spd-metric-icon"><Star size={18} /></span>
              <span className="spd-metric-label">Average rating</span>
              <span className="spd-metric-value">{Number(provider.rating).toFixed(1)}</span>
              <span className="spd-stars">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star
                    key={n}
                    size={13}
                    className={n <= Math.round(provider.rating) ? 'is-filled' : ''}
                  />
                ))}
              </span>
            </div>
            <div className="spd-metric">
              <span className="spd-metric-icon"><Wallet size={18} /></span>
              <span className="spd-metric-label">Earned</span>
              <span className="spd-metric-value">
                <span className="riyal-symbol">&#x20C1;</span>{formatMoney(earned)}
              </span>
              <span className="spd-metric-sub">from {completedOrders.length} completed orders</span>
            </div>
          </div>

          {ordersLoading ? (
            <div className="sf-state"><Loader2 size={28} className="spin" /><span>Loading orders…</span></div>
          ) : (
            <>
              <section className="sf-card">
                <header className="sf-card-head">
                  <h2>Active orders <span className="spd-head-count">{activeOrders.length}</span></h2>
                </header>
                {orderRows(activeOrders, false)}
              </section>

              <section className="sf-card">
                <header className="sf-card-head">
                  <h2>Completed orders <span className="spd-head-count">{completedOrders.length}</span></h2>
                </header>
                {orderRows(completedOrders, true)}
              </section>
            </>
          )}
        </div>
      )}

      {tab === 'services' && (
        <section className="sf-card">
          <header className="sf-card-head spd-card-head-row">
            <div>
              <h2>Assigned services</h2>
              <p>Which services this provider is allowed to take.</p>
            </div>
            {!addingService ? (
              <button
                className="sf-btn sf-btn--primary"
                onClick={() => setAddingService(true)}
                disabled={servicesBusy || availableServices.length === 0}
                title={availableServices.length === 0 ? 'Every service is already assigned' : undefined}
              >
                <Plus size={15} /> Add service
              </button>
            ) : (
              <div className="spd-add-row">
                <select
                  value={serviceToAdd}
                  onChange={(e) => setServiceToAdd(e.target.value)}
                  disabled={servicesBusy}
                >
                  <option value="">Select a service…</option>
                  {availableServices.map(s => (
                    <option key={s.id} value={s.id}>{s.name_en}</option>
                  ))}
                </select>
                <button
                  className="sf-btn sf-btn--primary"
                  onClick={handleAddService}
                  disabled={!serviceToAdd || servicesBusy}
                >
                  {servicesBusy ? <Loader2 size={15} className="spin" /> : 'Add'}
                </button>
                <button
                  className="sf-btn sf-btn--secondary"
                  onClick={() => { setAddingService(false); setServiceToAdd('') }}
                  disabled={servicesBusy}
                >
                  Cancel
                </button>
              </div>
            )}
          </header>

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
                      {svc.name_ar && <em dir="rtl">{svc.name_ar}</em>}
                    </span>
                    <span className="spd-service-meta">
                      {svc.base_price != null && (
                        <span><span className="riyal-symbol">&#x20C1;</span>{formatMoney(svc.base_price)}</span>
                      )}
                      {svc.duration_min != null && <span>{svc.duration_min} min</span>}
                    </span>
                    <span className={`spm-badge spm-badge--${item.is_active ? 'success' : 'muted'}`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      className="spd-icon-btn spd-icon-btn--danger"
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
        </section>
      )}

      {tab === 'documents' && (
        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Documents</h2>
            <p>Verification paperwork submitted by the provider.</p>
          </header>
          <ul className="spd-docs">
            {DOCUMENTS.map((doc) => {
              const Icon = doc.Icon
              const { key, label } = doc
              const url = provider[key]
              return (
                <li key={key} className="spd-doc">
                  <span className="spd-doc-icon"><Icon size={16} /></span>
                  <span className="spd-doc-label">{label}</span>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="spd-doc-link">
                      View
                    </a>
                  ) : (
                    <span className="spd-doc-missing">Not provided</span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {tab === 'wallet' && (
        <div className="spd-stack">
          <section className="sf-card">
            <header className="sf-card-head">
              <h2>Wallet</h2>
              <p>Balances held for this provider.</p>
            </header>
            <dl className="spd-rows">
              {[
                ['Available balance', provider.wallet?.available_balance],
                ['Locked balance', provider.wallet?.locked_balance],
                ['Total credited', provider.wallet?.total_credited],
                ['Total debited', provider.wallet?.total_debited],
              ].map(([label, value]) => (
                <div key={label} className="spd-row">
                  <dt>{label}</dt>
                  <dd><span className="riyal-symbol">&#x20C1;</span>{formatMoney(value)}</dd>
                </div>
              ))}
              <div className="spd-row">
                <dt>Currency</dt>
                <dd>{provider.wallet?.currency ?? 'SAR'}</dd>
              </div>
              <div className="spd-row">
                <dt>Wallet status</dt>
                <dd>
                  <span className={`spm-badge spm-badge--${provider.wallet?.status === 'ACTIVE' ? 'success' : 'muted'}`}>
                    {provider.wallet?.status ?? '—'}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {(provider.bankAccounts ?? []).length > 0 && (
            <section className="sf-card">
              <header className="sf-card-head">
                <h2>Bank accounts</h2>
              </header>
              <ul className="spd-banks">
                {provider.bankAccounts.map(acc => (
                  <li key={acc.id ?? acc.iban} className="spd-bank">
                    <strong>{acc.bank_name ?? 'Bank'}</strong>
                    <span>{acc.account_holder_name}</span>
                    {acc.iban && <em>{acc.iban}</em>}
                    {acc.is_default && <span className="spm-badge spm-badge--success">Default</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Account status</h2>
            <p>Controls whether this provider can sign in and receive new orders.</p>
          </header>

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
        </section>
      )}

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
