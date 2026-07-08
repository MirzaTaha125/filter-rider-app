import { useState, useEffect, useCallback } from 'react'
import { useSocket } from '../../../contexts/SocketContext'
import {
  Filter, X, UserCog, Clock,
  MapPin, Calendar,
  Layers, AlertTriangle, CheckCircle, Loader2,
  Package, User, Hash
} from 'lucide-react'
import {
  getAdminOrders,
  getAdminOrderDetails,
  cancelOrder,
  reassignOrder,
  rebroadcastOrder,
  getServices,
  getProviderDetails,
  getProviders,
} from '../../../api'
import './OrderManagement.css'


function OrderManagement() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    serviceId: 'All Services',
    status: 'Any Status'
  })
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [providerNames, setProviderNames] = useState({}) // { [providerId]: name }
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [activeOrderTab, setActiveOrderTab] = useState('details')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [availableServices, setAvailableServices] = useState([])
  const [confirmCancel, setConfirmCancel] = useState({ open: false, orderId: null })
  const [reassignState, setReassignState] = useState({ open: false, orderId: null, providerId: '', selectedName: '', submitting: false, error: '', spList: [], spLoading: false, spSearch: '' })
  const [messageModal, setMessageModal] = useState({ open: false, type: 'success', title: '', message: '' })
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
  }, [])

  useEffect(() => {
    setPage(1)
  }, [filters.status, filters.serviceId, filters.from, filters.to])

  useEffect(() => {
    fetchOrders()
  }, [page, filters.status, filters.serviceId, filters.from, filters.to])

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
        from: filters.from,
        to: filters.to,
        page,
        limit: LIMIT,
      })
      const list = Array.isArray(raw) ? raw : (raw?.orders ?? raw?.items ?? raw?.data ?? [])
      const orderList = Array.isArray(list) ? list : []
      const total = raw?.meta?.total ?? raw?.total ?? orderList.length
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

  const openConfirmCancel = (e, orderId) => {
    e.stopPropagation()
    setConfirmCancel({ open: true, orderId })
  }

  const closeConfirmCancel = () => setConfirmCancel({ open: false, orderId: null })

  const handleConfirmCancelOrder = async () => {
    if (!confirmCancel.orderId) return
    try {
      await cancelOrder(confirmCancel.orderId)
      closeConfirmCancel()
      if (isModalOpen && selectedOrder?.id === confirmCancel.orderId) closeModal()
      fetchOrders()
      setMessageModal({ open: true, type: 'success', title: 'Order cancelled', message: 'The order has been cancelled successfully.' })
    } catch (err) {
      setMessageModal({ open: true, type: 'error', title: 'Cancel failed', message: err.message || 'Failed to cancel order.' })
    }
  }

  const openReassignModal = async (e, orderId) => {
    e.stopPropagation()
    setReassignState({ open: true, orderId, providerId: '', selectedName: '', submitting: false, error: '', spList: [], spLoading: true, spSearch: '' })
    try {
      const res = await getProviders({ limit: 200, status: 'ACTIVE' })
      const list = Array.isArray(res) ? res : (res?.items ?? res?.users ?? res?.data ?? [])
      setReassignState(prev => ({ ...prev, spList: list, spLoading: false }))
    } catch {
      setReassignState(prev => ({ ...prev, spLoading: false }))
    }
  }

  const closeReassignModal = () => setReassignState({ open: false, orderId: null, providerId: '', selectedName: '', submitting: false, error: '', spList: [], spLoading: false, spSearch: '' })

  const handleReassignSubmit = async (e) => {
    e.preventDefault()
    if (!reassignState.orderId || !reassignState.providerId?.trim()) {
      setReassignState(prev => ({ ...prev, error: 'Please enter a provider ID.' }))
      return
    }
    setReassignState(prev => ({ ...prev, submitting: true, error: '' }))
    try {
      await reassignOrder(reassignState.orderId, reassignState.providerId.trim())
      closeReassignModal()
      fetchOrders()
      setMessageModal({ open: true, type: 'success', title: 'Order reassigned', message: 'The order has been reassigned to the new provider successfully.' })
    } catch (err) {
      setReassignState(prev => ({ ...prev, submitting: false, error: err.message || 'Failed to reassign order.' }))
    }
  }

  const handleRebroadcast = async (e, id) => {
    e.stopPropagation()
    try {
      await rebroadcastOrder(id)
      if (isModalOpen && selectedOrder?.id === id) closeModal()
      fetchOrders()
      setMessageModal({ open: true, type: 'success', title: 'Order rebroadcast', message: 'Order has been rebroadcasted successfully.' })
    } catch (err) {
      setMessageModal({ open: true, type: 'error', title: 'Rebroadcast failed', message: err.message || 'Failed to rebroadcast order.' })
    }
  }

  const closeMessageModal = () => setMessageModal(prev => ({ ...prev, open: false }))

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
    const isTerminal = order.status === 'COMPLETED' || order.status === 'CANCELLED'
    return (
      <div className="action-group">
        <button
          className="action-btn"
          title="Cancel order"
          onClick={(e) => openConfirmCancel(e, order.id)}
        >
          <X size={16} />
        </button>
        <button
          className="action-btn"
          title="Reassign SP"
          onClick={(e) => openReassignModal(e, order.id)}
        >
          <UserCog size={16} />
        </button>
        {!isTerminal && (
          <button
            className="btn-action-primary"
            onClick={(e) => handleRebroadcast(e, order.id)}
          >
            FORCE REBROADCAST
          </button>
        )}
      </div>
    )
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setPage(1)
    setFilters({
      from: '',
      to: '',
      serviceId: 'All Services',
      status: 'Any Status'
    })
  }

  const handleRowClick = async (order) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
    setDetailsLoading(true)
    try {
      const providerId = order.provider_id ?? order.provider?.id
      const [detailsRes, providerRes] = await Promise.allSettled([
        getAdminOrderDetails(order.id),
        providerId ? getProviderDetails(providerId) : Promise.resolve(null),
      ])
      const details = detailsRes.status === 'fulfilled' ? detailsRes.value : order
      // Detail endpoint doesn't return service/serviceType — preserve from list item
      if (!details.service && order.service) details.service = order.service
      if (!details.serviceType && order.serviceType) details.serviceType = order.serviceType
      if (!details.customer && order.customer) details.customer = order.customer
      if (providerRes.status === 'fulfilled' && providerRes.value) {
        const p = providerRes.value
        details.provider = {
          ...(details.provider ?? {}),
          _name: p.user?.full_name ?? p.full_name ?? p.name,
          _phone: p.user?.phone ?? p.phone,
          _email: p.user?.email ?? p.email,
        }
      }
      setSelectedOrder(details)
    } catch (err) {
      console.error('Failed to load order details:', err)
    } finally {
      setDetailsLoading(false)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedOrder(null)
    setActiveOrderTab('details')
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
                value={filters.from}
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
                value={filters.to}
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
          <button className="btn-apply-filters">Apply Filters</button>
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
                          {order.customer?.profile?.full_name
                            ?? order.customer?.profile?.company_name
                            ?? order.customer?.full_name
                            ?? order.customer?.name
                            ?? 'Customer'}
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

      {/* PREMIUM 2024 DESIGN: Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <div className="order-modal-overlay" onClick={closeModal}>
          <div className="premium-order-modal" onClick={(e) => e.stopPropagation()}>
            <div className="premium-modal-header">
              <div className="premium-header-id">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Hash size={20} color="#FCC246" />
                  <h2>{selectedOrder.order_no || selectedOrder.id}</h2>
                </div>
                <div className="premium-header-date">
                  Registered on {new Date(selectedOrder.created_at || selectedOrder.created_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="premium-header-actions">
                <div className={`modal-status-pill status-pill ${selectedOrder.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                  {selectedOrder.status || 'PENDING'}
                </div>
                <button type="button" className="modal-close-trigger" onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <nav className="premium-modal-tabs">
              <div className={`modal-tab ${activeOrderTab === 'details' ? 'active' : ''}`} onClick={() => setActiveOrderTab('details')}>GENERAL</div>
              <div className={`modal-tab ${activeOrderTab === 'customer' ? 'active' : ''}`} onClick={() => setActiveOrderTab('customer')}>CUSTOMER</div>
              <div className={`modal-tab ${activeOrderTab === 'provider' ? 'active' : ''}`} onClick={() => setActiveOrderTab('provider')}>PROVIDER</div>
              <div className={`modal-tab ${activeOrderTab === 'financials' ? 'active' : ''}`} onClick={() => setActiveOrderTab('financials')}>FINANCIALS</div>
              <div className={`modal-tab ${activeOrderTab === 'media' ? 'active' : ''}`} onClick={() => setActiveOrderTab('media')}>MEDIA</div>
              <div className={`modal-tab ${activeOrderTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveOrderTab('timeline')}>HISTORY</div>
            </nav>

            <div className="premium-modal-body">
              {detailsLoading ? (
                <div className="sheet-loading-state">
                  <Loader2 className="spin" size={32} />
                  <span>SYNCHRONIZING DATA...</span>
                </div>
              ) : (
                <div className="premium-tab-content">
                  {/* TAB 1: GENERAL DETAILS */}
                  {activeOrderTab === 'details' && (
                    <div className="premium-info-grid">
                      <div className="info-item-block">
                        <label>SERVICE</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Package size={18} color="#64748b" />
                          <span>{selectedOrder.service?.name_en ?? selectedOrder.service?.name ?? 'N/A'}</span>
                        </div>
                      </div>
                      <div className="info-item-block">
                        <label>SERVICE PACKAGE</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Layers size={18} color="#64748b" />
                          <span>{selectedOrder.serviceType?.name_en ?? selectedOrder.serviceType?.name ?? selectedOrder.category?.name_en ?? 'Standard'}</span>
                        </div>
                      </div>
                      <div className="info-item-block">
                        <label>SCHEDULED APPOINTMENT</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Calendar size={18} color="#64748b" />
                          <span>{selectedOrder.scheduled_at ? new Date(selectedOrder.scheduled_at).toLocaleString() : 'ASAP'}</span>
                        </div>
                      </div>
                      <div className="info-item-block">
                        <label>BOOKING MODEL</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Clock size={18} color="#64748b" />
                          <span>{selectedOrder.schedule_type ?? 'On-Demand'}</span>
                        </div>
                      </div>
                      <div className="info-item-block full-width">
                        <label>SERVICE LOCATION</label>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <MapPin size={18} color="#ef4444" style={{ marginTop: '2px' }} />
                          <span>{selectedOrder.address_text ?? 'No location available'}</span>
                        </div>
                      </div>
                      {/* Addons */}
                      {selectedOrder.addons?.length > 0 && (
                        <div className="info-item-block full-width">
                          <label>ADD-ONS</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {selectedOrder.addons.map((addon, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span>{addon.name_en ?? addon.name ?? addon.title ?? `Addon ${i + 1}`}</span>
                                <span style={{ color: '#64748b' }}>{addon.price ? `${selectedOrder.currency ?? 'SAR'} ${addon.price}` : ''}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Service-specific fields */}
                      {['car_wash', 'carpet_cleaning', 'home_cleaning', 'ac_cleaning', 'toilet_cleaning'].map(serviceKey => {
                        const svcData = selectedOrder[serviceKey];
                        if (!svcData) return null;
                        return Object.entries(svcData).map(([k, v]) => {
                          if (['order_id', 'id', 'created_at', 'updated_at'].includes(k)) return null;
                          if (v === null || v === undefined || v === '') return null;
                          return (
                            <div key={k} className="info-item-block">
                              <label>{k.replace(/_/g, ' ').toUpperCase()}</label>
                              <span>{String(v)}</span>
                            </div>
                          );
                        });
                      })}
                    </div>
                  )}

                  {/* TAB 2: CUSTOMER INFO */}
                  {activeOrderTab === 'customer' && (
                    <div className="premium-info-grid">
                      <div className="info-item-block">
                        <label>NAME / COMPANY</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <User size={18} color="#64748b" />
                          <span>{selectedOrder.customer?.profile?.full_name ?? selectedOrder.customer?.profile?.company_name ?? selectedOrder.customer?.full_name ?? '—'}</span>
                        </div>
                      </div>
                      <div className="info-item-block">
                        <label>ACCOUNT STATUS</label>
                        <span className={`status-badge ${getStatusClass(selectedOrder.customer?.status)}`}>
                          {selectedOrder.customer?.status ?? '—'}
                        </span>
                      </div>
                      <div className="info-item-block">
                        <label>GENDER</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <User size={18} color="#64748b" />
                          <span style={{ textTransform: 'capitalize' }}>{selectedOrder.customer?.profile?.gender ?? '—'}</span>
                        </div>
                      </div>
                      <div className="info-item-block">
                        <label>CUSTOMER ID</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Hash size={18} color="#64748b" />
                          <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{selectedOrder.customer_id ?? selectedOrder.customer?.id ?? '—'}</span>
                        </div>
                      </div>
                      {selectedOrder.customer?.profile?.national_address && (
                        <div className="info-item-block full-width">
                          <label>NATIONAL ADDRESS</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPin size={18} color="#64748b" />
                            <span>{selectedOrder.customer.profile.national_address}</span>
                          </div>
                        </div>
                      )}
                      {selectedOrder.ratings?.length > 0 && (
                        <div className="info-item-block full-width">
                          <label>RATING LEFT</label>
                          <span>{'★'.repeat(selectedOrder.ratings[0]?.rating ?? 0)} {selectedOrder.ratings[0]?.comment ?? ''}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: PROVIDER INFO */}
                  {activeOrderTab === 'provider' && (
                    <div className="premium-info-grid">
                      {selectedOrder.provider ? (
                        <>
                          <div className="info-item-block">
                            <label>NAME</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <User size={18} color="#64748b" />
                              <span>{selectedOrder.provider._name ?? '—'}</span>
                            </div>
                          </div>
                          <div className="info-item-block">
                            <label>PROVIDER ID</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Hash size={18} color="#64748b" />
                              <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{selectedOrder.provider.id}</span>
                            </div>
                          </div>
                          {selectedOrder.provider._phone && (
                            <div className="info-item-block">
                              <label>PHONE</label>
                              <span>{selectedOrder.provider._phone}</span>
                            </div>
                          )}
                          {selectedOrder.provider._email && (
                            <div className="info-item-block">
                              <label>EMAIL</label>
                              <span style={{ textTransform: 'lowercase' }}>{selectedOrder.provider._email}</span>
                            </div>
                          )}
                          <div className="info-item-block">
                            <label>STATUS</label>
                            <span className={`status-badge ${getStatusClass(selectedOrder.provider.status)}`}>
                              {selectedOrder.provider.status}
                            </span>
                          </div>
                          <div className="info-item-block">
                            <label>VERIFICATION</label>
                            <span className={`status-badge ${selectedOrder.provider.verification_status === 'VERIFIED' ? 'status-active' : 'status-pending'}`}>
                              {selectedOrder.provider.verification_status ?? '—'}
                            </span>
                          </div>
                          {selectedOrder.provider.profile?.bio && (
                            <div className="info-item-block full-width">
                              <label>BIO</label>
                              <span>{selectedOrder.provider.profile.bio}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="info-item-block full-width" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                          No provider assigned yet
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: MEDIA */}
                  {activeOrderTab === 'media' && (
                    <div>
                      {['BEFORE', 'AFTER'].map(type => {
                        const photos = (selectedOrder.media ?? []).filter(m => m.type === type);
                        if (photos.length === 0) return null;
                        return (
                          <div key={type} style={{ marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>{type} PHOTOS</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                              {photos.map(photo => (
                                <a key={photo.id} href={photo.file_url} target="_blank" rel="noopener noreferrer"
                                  style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                  <img src={photo.file_url} alt={type} style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} />
                                </a>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {(!selectedOrder.media || selectedOrder.media.length === 0) && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No media uploaded for this order</div>
                      )}
                    </div>
                  )}

                  {/* TAB 5: FINANCIALS */}
                  {activeOrderTab === 'financials' && (
                    <div className="finance-breakdown">
                      <div className="revenue-row">
                        <label>Standard Service Base Fee</label>
                        <span>
                          <small>{selectedOrder.currency || 'SAR'}</small>
                          {selectedOrder.base_price || '0.00'}
                        </span>
                      </div>
                      <div className="revenue-row">
                        <label>Additional Add-ons & Equipment</label>
                        <span>
                          <small>{selectedOrder.currency || 'SAR'}</small>
                          {selectedOrder.addons_total || '0.00'}
                        </span>
                      </div>
                      <div className="revenue-row grand-total">
                        <label>TOTAL PAYABLE AMOUNT</label>
                        <span>
                          <small>{selectedOrder.currency || 'SAR'}</small>
                          {selectedOrder.total_price || '0.00'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: HISTORY */}
                  {activeOrderTab === 'timeline' && (
                    <div className="timeline-pro">
                      {selectedOrder.timeline && selectedOrder.timeline.length > 0 ? (
                        selectedOrder.timeline.map((event, idx) => (
                          <div key={idx} className="timeline-row">
                            <div className={`timeline-node ${idx === 0 ? 'active' : ''}`} />
                            <div className="timeline-details">
                              <div className="timeline-time">{new Date(event.created_at).toLocaleString()}</div>
                              <div className="timeline-status-text">{event.status?.replace(/_/g, ' ')}</div>
                              {event.note && <div className="timeline-comment">{event.note}</div>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="sheet-loading-state" style={{ height: 'auto', padding: '2rem' }}>
                          <span>NO PREVIOUS HISTORY RECORDED</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="premium-modal-footer">
              <button type="button" className="btn-premium danger-subtle" onClick={(e) => openConfirmCancel(e, selectedOrder.id)}>CANCEL ORDER</button>
              <div className="modal-actions-primary">
                <button type="button" className="btn-premium outline" onClick={(e) => openReassignModal(e, selectedOrder.id)}>REASSIGN SP</button>
                {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                  <button type="button" className="btn-premium yellow" onClick={(e) => handleRebroadcast(e, selectedOrder.id)}>BROADCAST NOW</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm cancel order modal */}
      {confirmCancel.open && (
        <div className="order-dialog-overlay" onClick={closeConfirmCancel}>
          <div className="order-dialog order-dialog--confirm" onClick={(e) => e.stopPropagation()}>
            <div className="order-dialog__icon order-dialog__icon--warning">
              <AlertTriangle size={28} />
            </div>
            <h3 className="order-dialog__title">Cancel this order?</h3>
            <p className="order-dialog__text">This action cannot be undone. The order will be marked as cancelled.</p>
            <div className="order-dialog__actions">
              <button type="button" className="order-dialog__btn order-dialog__btn--secondary" onClick={closeConfirmCancel}>Keep order</button>
              <button type="button" className="order-dialog__btn order-dialog__btn--danger" onClick={handleConfirmCancelOrder}>Yes, cancel order</button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign provider modal */}
      {reassignState.open && (
        <div className="order-dialog-overlay" onClick={closeReassignModal}>
          <div className="order-dialog order-dialog--form" style={{ maxWidth: '480px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="order-dialog__icon order-dialog__icon--info">
              <UserCog size={28} />
            </div>
            <h3 className="order-dialog__title">Reassign to Provider</h3>
            {reassignState.selectedName && (
              <p style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600, margin: '0 0 0.75rem', textAlign: 'center' }}>
                Selected: {reassignState.selectedName}
              </p>
            )}
            <form onSubmit={handleReassignSubmit} className="order-dialog__form">
              {/* Search */}
              <div className="reassign-search-wrapper">
                <Filter size={15} className="reassign-search-icon" />
                <input
                  type="text"
                  className="order-dialog__input reassign-search-input"
                  placeholder="Search by name or phone..."
                  value={reassignState.spSearch}
                  onChange={(e) => setReassignState(prev => ({ ...prev, spSearch: e.target.value }))}
                  autoFocus
                />
              </div>

              {/* Provider list */}
              <div className="reassign-list">
                {reassignState.spLoading ? (
                  <div className="reassign-loading">
                    <Loader2 size={18} className="spin" /> Loading providers...
                  </div>
                ) : (() => {
                  const q = reassignState.spSearch.toLowerCase()
                  const filtered = reassignState.spList.filter(sp => {
                    const name = sp.full_name ?? sp.name ?? ''
                    const phone = sp.phone ?? ''
                    return name.toLowerCase().includes(q) || phone.includes(q)
                  })
                  if (filtered.length === 0) return (
                    <div className="reassign-empty">No providers found</div>
                  )
                  return filtered.map(sp => {
                    const id = sp.id ?? sp._id
                    const name = sp.full_name ?? sp.name ?? `SP-${id?.slice(0, 8)}`
                    const isSelected = reassignState.providerId === id
                    return (
                      <div
                        key={id}
                        className={`reassign-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setReassignState(prev => ({ ...prev, providerId: id, selectedName: name, error: '' }))}
                      >
                        <div className="reassign-item-info">
                          <span className="reassign-item-name">{name}</span>
                          {sp.phone && <span className="reassign-item-phone">{sp.phone}</span>}
                        </div>
                        {isSelected && <CheckCircle size={18} className="reassign-selected-icon" />}
                      </div>
                    )
                  })
                })()}
              </div>

              {reassignState.error && (
                <p className="order-dialog__error">{reassignState.error}</p>
              )}
              <div className="order-dialog__actions">
                <button type="button" className="order-dialog__btn order-dialog__btn--secondary" onClick={closeReassignModal}>Cancel</button>
                <button type="submit" className="order-dialog__btn order-dialog__btn--primary" disabled={reassignState.submitting || !reassignState.providerId}>
                  {reassignState.submitting ? <><Loader2 size={18} className="spin" /> Reassigning…</> : 'Reassign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success / Error message modal */}
      {messageModal.open && (
        <div className="order-dialog-overlay" onClick={closeMessageModal}>
          <div className={`order-dialog order-dialog--message order-dialog--${messageModal.type}`} onClick={(e) => e.stopPropagation()}>
            <div className={`order-dialog__icon order-dialog__icon--${messageModal.type}`}>
              {messageModal.type === 'success' ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
            </div>
            <h3 className="order-dialog__title">{messageModal.title}</h3>
            <p className="order-dialog__text">{messageModal.message}</p>
            <div className="order-dialog__actions">
              <button type="button" className="order-dialog__btn order-dialog__btn--primary" onClick={closeMessageModal}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderManagement
