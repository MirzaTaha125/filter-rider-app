import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSocket } from '../../../contexts/SocketContext'
import { Filter, Search, ChevronDown, Eye } from 'lucide-react'
import {
  getAdminOrders,
  getServices,
  getProviderDetails,
  getCustomerDetails,
} from '../../../api'
import StatTile from '../../../components/StatTile/StatTile'
import SortableTh from '../../../components/DataTable/SortableTh'
import { useTableSort } from '../../../components/DataTable/useTableSort'
import { getPaymentState, formatMoney } from './paymentStatus'
import { normalizeStatus, orderStatusTone } from './orderStatus'
import './OrderManagement.css'
import TableScroll from '../../../components/DataTable/TableScroll'


function OrderManagement() {
  const navigate = useNavigate()
  // Lets other pages deep-link a filtered view, e.g. the dashboard's
  // "Active orders" tile → /admin/orders?status=Broadcasted
  const [searchParams, setSearchParams] = useSearchParams()

  const sort = useTableSort()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    serviceId: 'All Services',
    status: searchParams.get('status') || 'Any Status'
  })
  const [dateFilters, setDateFilters] = useState({
    from: '',
    to: ''
  })
  const [tempDateFilters, setTempDateFilters] = useState({
    from: '',
    to: ''
  })
  const [providerNames, setProviderNames] = useState({})
  const [availableServices, setAvailableServices] = useState([])
  const [metrics, setMetrics] = useState({
    totalOrders: { value: 0, change: 0, trend: 'up' },
    pendingBroadcasts: { value: 0, status: 'STABLE' },
    activeIssues: { value: 0, status: 'GOOD' }
  })
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  // searchInput is what the user is typing; search is what the API is asked
  // for, debounced so every keystroke is not a request.
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const LIMIT = 10

  const { ordersSocket } = useSocket()

  useEffect(() => {
    loadInitialData()
    setTempDateFilters(dateFilters)
  }, [])

  useEffect(() => {
    setPage(1)
  }, [filters.status, filters.serviceId, dateFilters.from, dateFilters.to, search])

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    fetchOrders()
  }, [page, filters.status, filters.serviceId, dateFilters.from, dateFilters.to, search])

  // Real-time order updates via orders namespace
  const handleOrderEvent = useCallback((updatedOrder) => {
    if (!updatedOrder?.id) return
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === updatedOrder.id)
      if (exists) return prev.map((o) => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o)
      return [updatedOrder, ...prev]  // order.created — prepend
    })
  }, [])

  useEffect(() => {
    if (!ordersSocket) return
    const ORDER_EVENTS = [
      'order.created', 'order.broadcasted', 'order.assigned',
      'order.status.updated', 'order.cancelled', 'order.completed',
      'order.rating.created', 'orders.checklist.updated',
    ]
    ORDER_EVENTS.forEach((ev) => ordersSocket.on(ev, handleOrderEvent))
    return () => ORDER_EVENTS.forEach((ev) => ordersSocket.off(ev, handleOrderEvent))
  }, [ordersSocket, handleOrderEvent])

  async function loadInitialData() {
    try {
      const svcs = await getServices(null, true)
      setAvailableServices(Array.isArray(svcs) ? svcs : [])
    } catch (err) {
      console.error('Failed to load services:', err)
    }
  }

  async function fetchOrders() {
    setLoading(true)
    setError('')
    try {
      const raw = await getAdminOrders({
        status: filters.status,
        serviceId: filters.serviceId,
        from: dateFilters.from,
        to: dateFilters.to,
        search,
        page,
        limit: LIMIT,
      })
      const list = Array.isArray(raw) ? raw : (raw?.orders ?? raw?.items ?? raw?.data ?? [])
      const orderList = Array.isArray(list) ? list : []
      const total = raw?.meta?.total ?? raw?.total ?? orderList.length

      // Enrich customer data for orders that don't have full customer names (fetch in parallel)
      const customerFetches = orderList.map(order => {
        const hasCustomerName =
          order.customer?.profile?.full_name
          || order.customer?.profile?.company_name
          || order.customer?.full_name
          || order.customer?.name
          || order.customer_name

        if (!hasCustomerName && (order.customer_id || order.customer?.id)) {
          const customerId = order.customer_id || order.customer?.id
          return getCustomerDetails(customerId)
            .then(cRes => {
              order.customer = {
                ...(order.customer || {}),
                profile: cRes.profile || cRes,
                full_name: cRes.full_name || cRes.name,
                name: cRes.name || cRes.full_name,
                status: cRes.status,
              }
            })
            .catch(err => console.error('Failed to load customer for order', order.id, err))
        }
        return Promise.resolve()
      })

      await Promise.all(customerFetches)

      setOrders(orderList)
      setTotalCount(total)
      setMetrics(prev => ({
        ...prev,
        totalOrders: { ...prev.totalOrders, value: total },
        pendingBroadcasts: { value: orderList.filter(o => o.status === 'BROADCASTED').length, status: 'MONITORING' }
      }))
      // Fetch provider names for all unique providers on this page
      const uniqueProviderIds = [...new Set(
        orderList.map(o => o.provider_id ?? o.provider?.id).filter(Boolean)
      )]
      if (uniqueProviderIds.length > 0) {
        const results = await Promise.allSettled(uniqueProviderIds.map(id => getProviderDetails(id)))
        const namesMap = {}
        results.forEach((res, i) => {
          if (res.status === 'fulfilled' && res.value) {
            const p = res.value
            namesMap[uniqueProviderIds[i]] = p.user?.full_name ?? p.full_name ?? p.name ?? null
          }
        })
        setProviderNames(prev => ({ ...prev, ...namesMap }))
      }
    } catch (err) {
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  // Status also lives in the URL so a filtered view stays shareable and the
  // back button behaves.
  const setStatusFilter = (status) => {
    setFilters(prev => ({ ...prev, status }))
    setSearchParams(status === 'Any Status' ? {} : { status }, { replace: true })
  }

  const handleFilterChange = (key, value) => {
    if (key === 'from' || key === 'to') {
      setTempDateFilters(prev => ({ ...prev, [key]: value }))
    } else if (key === 'status') {
      setStatusFilter(value)
    } else {
      setFilters(prev => ({ ...prev, [key]: value }))
    }
  }

  const handleApplyDateFilter = () => {
    setPage(1)
    setDateFilters(tempDateFilters)
  }

  const clearFilters = () => {
    setPage(1)
    setSearchInput('')
    setFilters({ serviceId: 'All Services', status: 'Any Status' })
    setDateFilters({ from: '', to: '' })
    setTempDateFilters({ from: '', to: '' })
    setSearchParams({}, { replace: true })
  }

  const handleRowClick = (order) => {
    navigate(`/admin/orders/${order.id}`)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT))
  const from = totalCount ? (page - 1) * LIMIT + 1 : 0
  const to = Math.min(page * LIMIT, totalCount)

  // 1, last, current ±1, with ellipsis for the gaps.
  const pageButtons = (() => {
    const set = new Set(
      [1, totalPages, page, page - 1, page + 1].filter(p => p >= 1 && p <= totalPages),
    )
    const sorted = [...set].sort((a, b) => a - b)
    const out = []
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) out.push('…')
      out.push(p)
    })
    return out
  })()

  const activeFilterCount = [
    filters.status !== 'Any Status',
    filters.serviceId !== 'All Services',
    Boolean(dateFilters.from),
    Boolean(dateFilters.to),
  ].filter(Boolean).length

  const customerNameOf = (order) => (
    order.customer?.profile?.full_name
    || order.customer?.profile?.company_name
    || order.customer?.full_name
    || order.customer?.name
    || order.customer_name
    || (order.customer_id ? `Customer ${order.customer_id.slice(0, 8)}` : '—')
  )

  const providerNameOf = (order) => {
    const id = order.provider_id ?? order.provider?.id
    if (!id) return null
    return providerNames[id]
      ?? order.provider?.profile?.full_name
      ?? order.provider?.full_name
      ?? '—'
  }

  // Columns sort on the value behind the cell, not the rendered text: Payment
  // orders by amount rather than by the words "Paid"/"Unpaid". The backend has
  // no sort parameters, so this reorders the page that is loaded.
  const sortedOrders = sort.apply(orders, {
    order_no: (o) => o.order_no ?? o.id,
    customer: (o) => customerNameOf(o),
    provider: (o) => providerNameOf(o),
    service: (o) => o.service?.name_en ?? o.service?.name ?? '',
    status: (o) => normalizeStatus(o.status),
    payment: (o) => Number(o.total_price ?? 0),
  })

  return (
    <div className="dt-page-layout">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">
            Real-time monitoring and lifecycle management of all platform orders.
          </p>
        </div>
      </header>

      {/* KPI strip — same borderless tiles as the dashboard */}
      <div className="stat-tile-row">
        <StatTile
          label="Total orders"
          value={loading ? null : totalCount}
          hint={activeFilterCount > 0 ? 'Matching current filters' : 'All time'}
          onClick={activeFilterCount > 0 || search ? clearFilters : undefined}
          title={activeFilterCount > 0 || search ? 'Clear all filters' : undefined}
        />
        <StatTile
          label="Pending broadcasts"
          value={loading ? null : metrics.pendingBroadcasts.value}
          hint="Awaiting a provider"
          tone={metrics.pendingBroadcasts.value > 0 ? 'warning' : undefined}
          onClick={() => setStatusFilter('Broadcasted')}
          title="Show only broadcasted orders"
        />
        <StatTile
          label="On this page"
          value={loading ? null : orders.length}
          hint={`Page ${page} of ${totalPages}`}
        />
      </div>

      {/* ── Table card ─────────────────────────────────────────────────── */}
      <div className="dt-card">
        <div className="dt-toolbar">
          <div className="dt-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search order no, customer, provider or address…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="dt-toolbar-actions">
            <button
              className={`dt-btn ${filtersOpen ? 'is-active' : ''}`}
              onClick={() => setFiltersOpen(o => !o)}
            >
              <Filter size={15} />
              Filter options
              {activeFilterCount > 0 && <span className="dt-badge">{activeFilterCount}</span>}
              <ChevronDown size={15} className={filtersOpen ? 'is-flipped' : ''} />
            </button>
            {activeFilterCount > 0 && (
              <button className="dt-btn dt-btn--ghost" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>
        </div>

        {filtersOpen && (
          <div className="dt-filters">
            <div className="dt-field">
              <label htmlFor="om-from">From</label>
              <input
                id="om-from"
                type="date"
                value={tempDateFilters.from}
                onChange={(e) => handleFilterChange('from', e.target.value)}
              />
            </div>
            <div className="dt-field">
              <label htmlFor="om-to">To</label>
              <input
                id="om-to"
                type="date"
                value={tempDateFilters.to}
                onChange={(e) => handleFilterChange('to', e.target.value)}
              />
            </div>
            <div className="dt-field">
              <label htmlFor="om-service">Service</label>
              <select
                id="om-service"
                value={filters.serviceId}
                onChange={(e) => handleFilterChange('serviceId', e.target.value)}
              >
                <option value="All Services">All services</option>
                {availableServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name_en ?? service.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="dt-field">
              <label htmlFor="om-status">Status</label>
              <select
                id="om-status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option>Any Status</option>
                <option>Created</option>
                <option>Broadcasted</option>
                <option>Accepted</option>
                <option>On The Way</option>
                <option>Arrived</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
            </div>
            <button className="dt-btn dt-btn--primary" onClick={handleApplyDateFilter}>
              Apply dates
            </button>
          </div>
        )}

        <TableScroll>
          <table className="dt-table" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <SortableTh sortKey="order_no" sort={sort}>Order</SortableTh>
                <SortableTh sortKey="customer" sort={sort}>Customer</SortableTh>
                <SortableTh sortKey="provider" sort={sort}>Service provider</SortableTh>
                <SortableTh sortKey="service" sort={sort}>Service</SortableTh>
                <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
                <SortableTh sortKey="payment" sort={sort}>Payment</SortableTh>
                <th className="dt-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="dt-state">Loading orders…</td></tr>
              ) : error ? (
                <tr><td colSpan="7" className="dt-state dt-state--error">{error}</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan="7" className="dt-state">No orders match this view.</td></tr>
              ) : (
                sortedOrders.map((order) => {
                  const service = order.service || {}
                  const provider = providerNameOf(order)
                  const pay = getPaymentState(order)
                  const money = formatMoney(order.total_price, order.currency)
                  const status = normalizeStatus(order.status)

                  return (
                    <tr key={order.id} className="is-clickable" onClick={() => handleRowClick(order)}>
                      <td>
                        <div className="dt-cell-stack">
                          <strong>{order.order_no ?? `#${order.id?.slice(0, 8)}`}</strong>
                          <em>{new Date(order.created_at).toLocaleDateString()}</em>
                        </div>
                      </td>
                      <td>{customerNameOf(order)}</td>
                      <td>
                        {provider
                          ? provider
                          : <span className="dt-muted">Unassigned</span>}
                      </td>
                      <td>{service.name_en ?? service.name ?? '—'}</td>
                      <td>
                        <span className={`dt-status dt-status--${orderStatusTone(status)}`}>
                          {status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <div className="dt-cell-stack">
                          <span className={`dt-dot-label dt-tone--${pay.tone}`}>
                            <i className="dt-dot" />
                            {pay.label}
                          </span>
                          <em>
                            <span className="riyal-symbol">&#x20C1;</span>{money.amount}
                          </em>
                        </div>
                      </td>
                      <td className="dt-col-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="dt-icon-btn"
                          title={`View ${order.order_no ?? 'order'}`}
                          aria-label={`View ${order.order_no ?? 'order'}`}
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </TableScroll>

        <footer className="dt-foot">
          <span className="dt-foot-info">
            {totalCount > 0
              ? <>Showing {from} – {to} of {totalCount.toLocaleString()}</>
              : 'No orders'}
          </span>

          {totalCount > 0 && (
            <div className="dt-pager">
              <button
                className="dt-page"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
              >
                Prev
              </button>
              {pageButtons.map((p, i) => (
                p === '…'
                  ? <span key={`gap-${i}`} className="dt-page-gap">…</span>
                  : (
                    <button
                      key={p}
                      className={`dt-page ${p === page ? 'is-current' : ''}`}
                      onClick={() => setPage(p)}
                      aria-current={p === page ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  )
              ))}
              <button
                className="dt-page"
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  )
}

export default OrderManagement
