import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2, Building2, User, Phone, MapPin, Calendar, AlertTriangle,
  ShieldCheck, ShieldOff, Home, Briefcase, ChevronRight, Star,
} from 'lucide-react'
import { getCustomerDetails, updateCustomerStatus } from '../../../api'
import PageHeader from '../../../components/PageHeader/PageHeader'
import StatTile from '../../../components/StatTile/StatTile'
import SortableTh from '../../../components/DataTable/SortableTh'
import { useTableSort } from '../../../components/DataTable/useTableSort'
import { normalizeStatus, orderStatusTone } from '../orders/orderStatus'
import './CustomerDetail.css'
import TableScroll from '../../../components/DataTable/TableScroll'

const ADDRESS_ICONS = { HOME: Home, OFFICE: Briefcase, OTHER: MapPin }

function initials(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function money(value) {
  return Number(value ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(value, withTime = false) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return withTime ? d.toLocaleString() : d.toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/** One labelled fact in the identity column. */
function Fact({ icon: Icon, label, children }) {
  return (
    <div className="cd-fact">
      <span className="cd-fact-label">{label}</span>
      <span className="cd-fact-value">
        {Icon && <Icon size={14} />}
        <span>{children}</span>
      </span>
    </div>
  )
}

/**
 * One customer, as a record rather than a form: who they are on the left,
 * what they are worth and what they have done on the right.
 *
 * The layout follows the usual CRM record convention — identity and contact
 * pinned in a side rail, headline numbers along the top where the eye lands
 * first, and the activity history as the main body — and is built from the same
 * StatTile / dt-table pieces as the rest of the panel so it reads as one product.
 */
function CustomerDetail() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const sort = useTableSort('date', 'desc')

  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: '' })
  const [avatarBroken, setAvatarBroken] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setCustomer(await getCustomerDetails(customerId))
    } catch (err) {
      setError(err.message || 'Failed to load customer details')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => { load() }, [load])

  const confirmStatusChange = async () => {
    if (!customer) return
    setStatusUpdating(true)
    try {
      await updateCustomerStatus(customer.id, confirmDialog.action)
      setConfirmDialog({ open: false, action: '' })
      await load()
    } catch (err) {
      setError(err.message || 'Failed to update status')
    } finally {
      setStatusUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="cd-state">
        <Loader2 size={34} className="spin" />
        <span>Loading customer…</span>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="cd-state">
        <AlertTriangle size={34} />
        <h2>Could not load this customer</h2>
        <p>{error || 'Customer not found'}</p>
      </div>
    )
  }

  const isCorporate = customer.accountType === 'CORPORATE'
  const isActive = customer.status === 'Active'
  const orders = Array.isArray(customer.orderHistory) ? customer.orderHistory : []
  const addresses = Array.isArray(customer.addresses) ? customer.addresses : []
  const totalOrders = customer.totalOrders ?? orders.length
  const totalSpent = Number(customer.totalSpent ?? 0)
  const avgOrder = totalOrders > 0 ? totalSpent / totalOrders : 0
  const online = String(customer.liveStatus ?? '').toUpperCase() === 'ONLINE'

  // The list endpoint returns orderNo / date / amount — not the raw Prisma
  // column names the old markup reached for, which is why every row here used
  // to read "Order #undefined" on an "Invalid Date".
  const sortedOrders = sort.apply(orders, {
    orderNo: (o) => o.orderNo,
    service: (o) => o.serviceName,
    provider: (o) => o.providerName,
    date: (o) => new Date(o.date ?? 0).getTime(),
    amount: (o) => Number(o.amount ?? 0),
    status: (o) => o.status,
  })

  return (
    <div className="customer-detail-page">
      <PageHeader title={customer.name} subtitle={customer.phone} />

      <div className="cd-layout">
        {/* ── Identity rail ───────────────────────────────────────────────── */}
        <aside className="cd-rail">
          <section className="cd-card cd-identity">
            <div className={`cd-avatar ${isCorporate ? 'is-corporate' : ''}`}>
              {customer.avatar && !avatarBroken
                ? <img src={customer.avatar} alt="" onError={() => setAvatarBroken(true)} />
                : (isCorporate ? <Building2 size={28} /> : initials(customer.name))}
              <span className={`cd-presence ${online ? 'is-online' : ''}`} title={online ? 'Online' : 'Offline'} />
            </div>

            <h2 className="cd-name">{customer.name}</h2>

            <div className="cd-tags">
              <span className={`dt-status dt-status--${isActive ? 'success' : 'neutral'}`}>
                {customer.status}
              </span>
              <span className="dt-status dt-status--neutral">
                {isCorporate ? <Building2 size={11} /> : <User size={11} />}
                {isCorporate ? 'Corporate' : 'Personal'}
              </span>
            </div>

            <div className="cd-facts">
              <Fact icon={Phone} label="Phone">{customer.phone || '—'}</Fact>
              <Fact icon={Calendar} label="Customer since">{formatDate(customer.joinDate)}</Fact>
              <Fact icon={MapPin} label="City">{customer.city || '—'}</Fact>
            </div>

            <button
              className={`cd-status-btn ${isActive ? 'is-danger' : ''}`}
              onClick={() => setConfirmDialog({ open: true, action: isActive ? 'Disabled' : 'Active' })}
              disabled={statusUpdating}
            >
              {isActive ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
              {isActive ? 'Disable account' : 'Enable account'}
            </button>
          </section>

          <section className="cd-card">
            <h3 className="cd-card-title">
              Saved addresses
              <span className="cd-count">{addresses.length}</span>
            </h3>
            {addresses.length === 0 ? (
              <p className="cd-empty">No addresses saved yet.</p>
            ) : (
              <ul className="cd-addresses">
                {addresses.map((a) => {
                  const Icon = ADDRESS_ICONS[a.type] ?? MapPin
                  return (
                    <li key={a.id} className="cd-address">
                      <Icon size={15} />
                      <div>
                        <strong>
                          {a.type ? a.type.charAt(0) + a.type.slice(1).toLowerCase() : 'Address'}
                          {a.is_default && <span className="cd-default"><Star size={10} /> Default</span>}
                        </strong>
                        <span>{a.address_line}</span>
                        <em>{[a.city, a.country].filter(Boolean).join(', ')}</em>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </aside>

        {/* ── Record body ─────────────────────────────────────────────────── */}
        <div className="cd-main">
          <div className="stat-tile-row">
            <StatTile label="Total orders" value={totalOrders} hint="All time" />
            <StatTile label="Total spent" value={totalSpent} money hint="All time" />
            <StatTile label="Avg order value" value={avgOrder} money hint="Spend ÷ orders" />
            <StatTile label="Wallet balance" value={customer.walletBalance ?? 0} money hint="Available now" />
          </div>

          <section className="dt-card">
            <div className="dt-toolbar">
              <h3 className="cd-card-title">
                Order history
                <span className="cd-count">{orders.length}</span>
              </h3>
            </div>

            <TableScroll>
              <table className="dt-table" style={{ minWidth: 760 }}>
                <thead>
                  <tr>
                    <SortableTh sortKey="orderNo" sort={sort}>Order</SortableTh>
                    <SortableTh sortKey="service" sort={sort}>Service</SortableTh>
                    <SortableTh sortKey="provider" sort={sort}>Provider</SortableTh>
                    <SortableTh sortKey="date" sort={sort}>Date</SortableTh>
                    <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
                    <SortableTh sortKey="amount" sort={sort}>Amount</SortableTh>
                    <th className="dt-col-actions" aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan="7" className="dt-state">This customer has not ordered yet.</td></tr>
                  ) : (
                    sortedOrders.map((order) => {
                      const status = normalizeStatus(order.status)
                      return (
                        <tr
                          key={order.id}
                          className="is-clickable"
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                        >
                          <td><strong>{order.orderNo ?? `#${String(order.id).slice(0, 8)}`}</strong></td>
                          <td>{order.serviceName || '—'}</td>
                          <td className="dt-muted">{order.providerName || 'Unassigned'}</td>
                          <td className="dt-muted">{formatDate(order.date, true)}</td>
                          <td>
                            <span className={`dt-status dt-status--${orderStatusTone(status)}`}>
                              {status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td>
                            <strong>
                              <span className="riyal-symbol">&#x20C1;</span>{money(order.amount)}
                            </strong>
                          </td>
                          <td className="dt-col-actions">
                            <ChevronRight size={16} className="dt-muted" />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </TableScroll>
          </section>
        </div>
      </div>

      {confirmDialog.open && (
        <div className="cd-dialog-backdrop" onClick={() => setConfirmDialog({ open: false, action: '' })}>
          <div className="cd-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="cd-dialog-icon"><AlertTriangle size={26} /></div>
            <h3>{confirmDialog.action === 'Disabled' ? 'Disable this account?' : 'Enable this account?'}</h3>
            <p>
              {confirmDialog.action === 'Disabled'
                ? `${customer.name} will not be able to place new orders.`
                : `${customer.name} will be able to place orders again.`}
            </p>
            <div className="cd-dialog-actions">
              <button
                className="dt-btn"
                onClick={() => setConfirmDialog({ open: false, action: '' })}
                disabled={statusUpdating}
              >
                Cancel
              </button>
              <button
                className={`dt-btn ${confirmDialog.action === 'Disabled' ? 'is-danger' : 'dt-btn--primary'}`}
                onClick={confirmStatusChange}
                disabled={statusUpdating}
              >
                {statusUpdating ? <><Loader2 size={15} className="spin" /> Updating…</> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerDetail
