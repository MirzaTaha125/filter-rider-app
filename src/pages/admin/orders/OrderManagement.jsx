import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../../contexts/SocketContext'
import {
  Filter, Clock,
  MapPin, Calendar,
} from 'lucide-react'
import {
  getAdminOrders,
  getServices,
  getProviderDetails,
  getCustomerDetails,
} from '../../../api'
import './OrderManagement.css'


function OrderManagement() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    serviceId: 'All Services',
    status: 'Any Status'
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
  const LIMIT = 10

  const { ordersSocket } = useSocket()

  useEffect(() => {
    loadInitialData()
    setTempDateFilters(dateFilters)
  }, [])

  useEffect(() => {
    setPage(1)
  }, [filters.status, filters.serviceId, dateFilters.from, dateFilters.to])

  useEffect(() => {
    fetchOrders()
  }, [page, filters.status, filters.serviceId, dateFilters.from, dateFilters.to])

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
        page,
        limit: LIMIT,
      })
      const list = Array.isArray(raw) ? raw : (raw?.orders ?? raw?.items ?? raw?.data ?? [])
      const orderList = Array.isArray(list) ? list : []
      const total = raw?.meta?.total ?? raw?.total ?? orderList.length
      console.log('Orders data:', orderList[0]) // Debug: see actual structure

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

  const handleOrderAction = (e, orderId, action) => {
    e.stopPropagation()
    // Navigate to detail page where actions can be performed
    navigate(`/admin/orders/${orderId}`)
  }

  const getStatusClass = (status) => {
    const statusMap = {
      'BROADCASTED': 'status-broadcasted',
      'CREATED': 'status-created',
      'IN PROGRESS': 'status-progress',
      'CANCELLED': 'status-cancelled'
    }
    return statusMap[status] || 'status-default'
  }

  const renderActions = (order) => {
    return (
      <div className="action-group">
        <button
          className="action-btn view-details"
          title="View details"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/admin/orders/${order.id}`)
          }}
        >
          View Details
        </button>
      </div>
    )
  }

  const handleFilterChange = (key, value) => {
    if (key === 'from' || key === 'to') {
      setTempDateFilters(prev => ({ ...prev, [key]: value }))
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
    setFilters({
      serviceId: 'All Services',
      status: 'Any Status'
    })
    setDateFilters({ from: '', to: '' })
    setTempDateFilters({ from: '', to: '' })
  }

  const handleRowClick = (order) => {
    navigate(`/admin/orders/${order.id}`)
  }

  return (
    <div className="order-management">
      {/* Header */}
      <div className="order-header">
        <div className="order-header-content">
          <div>
            <h1 className="order-title">Order Management</h1>
            <p className="order-subtitle">Real-time monitoring and lifecycle management of all platform orders.</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="order-metrics">
        <div className="metric-card">
          <div className="metric-label">Total Orders Today</div>
          <div className="metric-value">{metrics.totalOrders.value.toLocaleString()}</div>
          <div className="metric-change positive">
            +{metrics.totalOrders.change}%
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Pending Broadcasts</div>
          <div className="metric-value">{metrics.pendingBroadcasts.value}</div>
          <div className="metric-badge warning">{metrics.pendingBroadcasts.status}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active Issues</div>
          <div className="metric-value critical">{metrics.activeIssues.value}</div>
          <div className="metric-badge critical">{metrics.activeIssues.status}</div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-header">
          <div className="filter-title">
            <Filter size={18} />
            <span>Filter Orders</span>
          </div>
          <button className="filter-clear" onClick={clearFilters}>
            Clear all filters
          </button>
        </div>
        <div className="filter-controls">
          <div className="filter-group">
            <label className="filter-label">FROM</label>
            <div className="filter-input-wrapper">
              <input
                type="date"
                className="filter-input"
                value={tempDateFilters.from}
                onChange={(e) => handleFilterChange('from', e.target.value)}
              />
            </div>
          </div>
          <div className="filter-group">
            <label className="filter-label">TO</label>
            <div className="filter-input-wrapper">
              <input
                type="date"
                className="filter-input"
                value={tempDateFilters.to}
                onChange={(e) => handleFilterChange('to', e.target.value)}
              />
            </div>
          </div>
          <div className="filter-group">
            <label className="filter-label">SERVICE TYPE</label>
            <select
              className="filter-select"
              value={filters.serviceId}
              onChange={(e) => handleFilterChange('serviceId', e.target.value)}
            >
              <option value="All Services">All Services</option>
              {availableServices.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">STATUS</label>
            <select
              className="filter-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option>Any Status</option>
              <option>Created</option>
              <option>Broadcasted</option>
              <option>In Progress</option>
              <option>Cancelled</option>
            </select>
          </div>
          <button className="btn-apply-filters" onClick={handleApplyDateFilter}>Apply Filters</button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>ORDER ID</th>
              <th>CUSTOMER</th>
              <th>SERVICE PROVIDER</th>
              <th>SERVICE</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="loading-message">Loading orders...</td></tr>
            ) : error ? (
              <tr><td colSpan="6" className="api-error">{error}</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan="6" className="loading-message">No orders found.</td></tr>
            ) : (
              orders.map((order) => {
                const service = order.service || { name: 'Unknown', color: '#6b7280' }
                return (
                  <tr
                    key={order.id}
                    className="table-row"
                    onClick={() => handleRowClick(order)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="order-id-column">
                      <div className="order-id-cell">
                        <span className="order-id">{order.order_no ?? `#${order.id?.slice(0, 8)}`}</span>
                        <span className="order-date">{new Date(order.created_at || order.date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="customer-column">
                      <div className="user-cell">
                        <span className="user-name">
                          {(() => {
                            const customerName =
                              order.customer?.profile?.full_name
                              || order.customer?.profile?.company_name
                              || order.customer?.full_name
                              || order.customer?.name
                              || order.customer_name
                              || (order.customer_id && `Customer ${order.customer_id.slice(0, 8)}`)
                              || 'N/A'
                            if (!customerName || customerName === 'N/A') {
                              console.log('Customer data missing:', { customer: order.customer, customer_id: order.customer_id })
                            }
                            return customerName
                          })()}
                        </span>
                      </div>
                    </td>
                    <td className="provider-column">
                      {order.provider_id ?? order.provider?.id ? (
                        <div className="user-cell">
                          <span className="user-name">
                            {providerNames[order.provider_id ?? order.provider?.id]
                              ?? order.provider?.profile?.full_name
                              ?? order.provider?.full_name
                              ?? '—'}
                          </span>
                        </div>
                      ) : (
                        <span className="not-assigned">—</span>
                      )}
                    </td>
                    <td className="service-column">
                      <div className="order-id-cell">
                        <span className="user-name" style={{ fontWeight: 500 }}>{service.name_en ?? service.name}</span>
                        {(order.category || order.service_package) && (
                          <span className="order-date">
                            {order.category?.name_en || order.category?.name || order.service_package?.name_en || order.service_package?.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="status-column">
                      <span className={`status-badge ${getStatusClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="actions-column" onClick={(e) => e.stopPropagation()}>
                      <div className="actions-cell">
                        {renderActions(order)}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (() => {
        const totalPages = Math.ceil(totalCount / LIMIT)
        const from = (page - 1) * LIMIT + 1
        const to = Math.min(page * LIMIT, totalCount)

        // Build page numbers: always show 1, last, current ±1, with ellipsis
        const pages = new Set([1, totalPages, page, page - 1, page + 1].filter(p => p >= 1 && p <= totalPages))
        const sorted = [...pages].sort((a, b) => a - b)
        const withEllipsis = []
        sorted.forEach((p, i) => {
          if (i > 0 && p - sorted[i - 1] > 1) withEllipsis.push('…')
          withEllipsis.push(p)
        })

        return (
          <div className="pagination">
            <div className="pagination-info">
              Showing {from} – {to} of {totalCount.toLocaleString()} orders
            </div>
            <div className="pagination-controls">
              <button className="pagination-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
              {withEllipsis.map((p, i) =>
                p === '…'
                  ? <span key={`e${i}`} className="pagination-ellipsis">…</span>
                  : <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              )}
              <button className="pagination-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
            </div>
          </div>
        )
      })()}

    </div>
  )
}

export default OrderManagement
