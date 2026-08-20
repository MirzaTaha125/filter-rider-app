import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, X, AlertTriangle, CheckCircle, UserCog, Filter, Hash, Package, Layers, Calendar, Clock, MapPin, User } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getAdminOrderDetails,
  getProviderDetails,
  getCustomerDetails,
  getServices,
  cancelOrder,
  reassignOrder,
  rebroadcastOrder,
  getProviders,
} from '../../../api'
import './OrderDetail.css'

function OrderDetail() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('details')

  // Modal states
  const [confirmCancel, setConfirmCancel] = useState({ open: false })
  const [reassignState, setReassignState] = useState({ open: false, providerId: '', selectedName: '', submitting: false, error: '', spList: [], spLoading: false, spSearch: '' })
  const [messageModal, setMessageModal] = useState({ open: false, type: 'success', title: '', message: '' })

  useEffect(() => {
    loadOrderDetails()
  }, [orderId])

  async function loadOrderDetails() {
    setLoading(true)
    setError('')
    try {
      const [detailsRes, providerRes] = await Promise.allSettled([
        getAdminOrderDetails(orderId),
        null // will fetch provider separately if needed
      ])

      let details = detailsRes.status === 'fulfilled' ? detailsRes.value : null
      if (!details) {
        setError('Failed to load order details')
        return
      }

      // Fetch customer details if needed
      if (details.customer_id || details.customer?.id) {
        try {
          const customerId = details.customer_id || details.customer?.id
          const cRes = await getCustomerDetails(customerId)
          details.customer = {
            ...(details.customer || {}),
            profile: cRes.profile || cRes,
            full_name: cRes.full_name || cRes.name,
            status: cRes.status,
          }
        } catch (err) {
          console.error('Failed to load customer:', err)
        }
      }

      // Fetch service details if needed
      if (details.service_id || details.service?.id) {
        try {
          const services = await getServices()
          const serviceList = Array.isArray(services) ? services : []
          const foundService = serviceList.find(s => s.id === (details.service_id || details.service?.id))
          if (foundService) {
            details.service = {
              ...(details.service || {}),
              name: foundService.name || foundService.name_en,
              name_en: foundService.name_en || foundService.name,
              id: foundService.id,
            }
          }
        } catch (err) {
          console.error('Failed to load service:', err)
        }
      }

      // Fetch provider details if assigned
      if (details.provider_id || details.provider?.id) {
        try {
          const providerId = details.provider_id || details.provider?.id
          const pRes = await getProviderDetails(providerId)
          details.provider = {
            ...(details.provider || {}),
            _name: pRes.user?.full_name || pRes.full_name || pRes.name,
            _phone: pRes.user?.phone || pRes.phone,
            _email: pRes.user?.email || pRes.email,
          }
        } catch (err) {
          console.error('Failed to load provider:', err)
        }
      }

      setOrder(details)
    } catch (err) {
      setError(err.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  const getStatusClass = (status) => {
    const statusMap = {
      'BROADCASTED': 'status-broadcasted',
      'CREATED': 'status-created',
      'IN PROGRESS': 'status-progress',
      'CANCELLED': 'status-cancelled',
      'COMPLETED': 'status-completed'
    }
    return statusMap[status] || 'status-default'
  }

  const handleConfirmCancelOrder = async () => {
    if (!order?.id) return
    try {
      await cancelOrder(order.id)
      setConfirmCancel({ open: false })
      setMessageModal({ open: true, type: 'success', title: 'Order cancelled', message: 'The order has been cancelled successfully.' })
      setTimeout(() => loadOrderDetails(), 1000)
    } catch (err) {
      setMessageModal({ open: true, type: 'error', title: 'Cancel failed', message: err.message || 'Failed to cancel order.' })
    }
  }

  const openReassignModal = async () => {
    setReassignState({ open: true, providerId: '', selectedName: '', submitting: false, error: '', spList: [], spLoading: true, spSearch: '' })
    try {
      const res = await getProviders({ limit: 200, status: 'ACTIVE' })
      const list = Array.isArray(res) ? res : (res?.items || res?.users || res?.data || [])
      setReassignState(prev => ({ ...prev, spList: list, spLoading: false }))
    } catch {
      setReassignState(prev => ({ ...prev, spLoading: false }))
    }
  }

  const handleReassignSubmit = async (e) => {
    e.preventDefault()
    if (!order?.id || !reassignState.providerId?.trim()) {
      setReassignState(prev => ({ ...prev, error: 'Please select a provider.' }))
      return
    }
    setReassignState(prev => ({ ...prev, submitting: true, error: '' }))
    try {
      await reassignOrder(order.id, reassignState.providerId.trim())
      setReassignState({ open: false, providerId: '', selectedName: '', submitting: false, error: '', spList: [], spLoading: false, spSearch: '' })
      setMessageModal({ open: true, type: 'success', title: 'Order reassigned', message: 'The order has been reassigned successfully.' })
      setTimeout(() => loadOrderDetails(), 1000)
    } catch (err) {
      setReassignState(prev => ({ ...prev, submitting: false, error: err.message || 'Failed to reassign order.' }))
    }
  }

  const handleRebroadcast = async () => {
    if (!order?.id) return
    try {
      await rebroadcastOrder(order.id)
      setMessageModal({ open: true, type: 'success', title: 'Order rebroadcast', message: 'Order has been rebroadcasted successfully.' })
      setTimeout(() => loadOrderDetails(), 1000)
    } catch (err) {
      setMessageModal({ open: true, type: 'error', title: 'Rebroadcast failed', message: err.message || 'Failed to rebroadcast order.' })
    }
  }

  const closeMessageModal = () => setMessageModal(prev => ({ ...prev, open: false }))

  if (loading) {
    return (
      <div className="order-detail-loading">
        <Loader2 size={40} className="spin" />
        <span>Loading order details...</span>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="order-detail-error">
        <AlertTriangle size={40} />
        <h2>Error Loading Order</h2>
        <p>{error || 'Order not found'}</p>
      </div>
    )
  }

  const isTerminal = order.status === 'COMPLETED' || order.status === 'CANCELLED'

  return (
    <div className="order-detail-page">
      <PageHeader
        title={`Order ${order.order_no || order.id?.slice(0, 8)}`}
        subtitle={`Created on ${new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      />

      <div className="order-detail-container">
        {/* Status & Actions Bar */}
        <div className="order-detail-bar">
          <div className="status-section">
            <span className={`status-badge ${getStatusClass(order.status)}`}>
              {order.status || 'PENDING'}
            </span>
          </div>
          <div className="actions-section">
            <button
              className="btn-action cancel"
              onClick={() => setConfirmCancel({ open: true })}
              title="Cancel order"
            >
              <X size={18} />
              Cancel Order
            </button>
            <button
              className="btn-action reassign"
              onClick={openReassignModal}
              title="Reassign provider"
            >
              <UserCog size={18} />
              Reassign SP
            </button>
            {!isTerminal && (
              <button
                className="btn-action broadcast"
                onClick={handleRebroadcast}
              >
                Force Rebroadcast
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-section">
          <nav className="tabs-nav">
            {['details', 'customer', 'provider', 'financials', 'media', 'timeline'].map(tab => (
              <button
                key={tab}
                className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <div className="info-grid">
              <div className="info-item">
                <label>SERVICE</label>
                <div className="info-value">
                  <Package size={18} />
                  <span>{order.service?.name_en || order.service?.name || 'N/A'}</span>
                </div>
              </div>
              <div className="info-item">
                <label>SERVICE PACKAGE</label>
                <div className="info-value">
                  <Layers size={18} />
                  <span>{order.serviceType?.name_en || order.category?.name_en || 'Standard'}</span>
                </div>
              </div>
              <div className="info-item">
                <label>SCHEDULED APPOINTMENT</label>
                <div className="info-value">
                  <Calendar size={18} />
                  <span>{order.scheduled_at ? new Date(order.scheduled_at).toLocaleString() : 'ASAP'}</span>
                </div>
              </div>
              <div className="info-item">
                <label>BOOKING MODEL</label>
                <div className="info-value">
                  <Clock size={18} />
                  <span>{order.schedule_type || 'On-Demand'}</span>
                </div>
              </div>
              <div className="info-item full-width">
                <label>SERVICE LOCATION</label>
                <div className="info-value">
                  <MapPin size={18} />
                  <span>{order.address_text || 'No location available'}</span>
                </div>
              </div>
              {order.addons?.length > 0 && (
                <div className="info-item full-width">
                  <label>ADD-ONS</label>
                  <div className="addons-list">
                    {order.addons.map((addon, i) => (
                      <div key={i} className="addon-row">
                        <span>{addon.name_en || addon.name || `Addon ${i + 1}`}</span>
                        <span className="addon-price">{addon.price ? `${order.currency || 'SAR'} ${addon.price}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CUSTOMER TAB */}
          {activeTab === 'customer' && (
            <div className="info-grid">
              <div className="info-item">
                <label>NAME / COMPANY</label>
                <div className="info-value">
                  <User size={18} />
                  <span>{order.customer?.profile?.full_name || order.customer?.full_name || '—'}</span>
                </div>
              </div>
              <div className="info-item">
                <label>ACCOUNT STATUS</label>
                <span className={`status-badge ${getStatusClass(order.customer?.status)}`}>
                  {order.customer?.status || '—'}
                </span>
              </div>
              <div className="info-item">
                <label>CUSTOMER ID</label>
                <div className="info-value">
                  <Hash size={18} />
                  <span style={{ fontFamily: 'monospace' }}>{order.customer_id || order.customer?.id || '—'}</span>
                </div>
              </div>
              {order.customer?.profile?.national_address && (
                <div className="info-item full-width">
                  <label>NATIONAL ADDRESS</label>
                  <div className="info-value">
                    <MapPin size={18} />
                    <span>{order.customer.profile.national_address}</span>
                  </div>
                </div>
              )}
              {order.ratings?.length > 0 && (
                <div className="info-item full-width">
                  <label>RATING LEFT</label>
                  <span>{'★'.repeat(order.ratings[0]?.rating || 0)} {order.ratings[0]?.comment || ''}</span>
                </div>
              )}
            </div>
          )}

          {/* PROVIDER TAB */}
          {activeTab === 'provider' && (
            <div className="info-grid">
              {order.provider ? (
                <>
                  <div className="info-item">
                    <label>NAME</label>
                    <div className="info-value">
                      <User size={18} />
                      <span>{order.provider._name || '—'}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <label>PROVIDER ID</label>
                    <div className="info-value">
                      <Hash size={18} />
                      <span style={{ fontFamily: 'monospace' }}>{order.provider.id}</span>
                    </div>
                  </div>
                  {order.provider._phone && (
                    <div className="info-item">
                      <label>PHONE</label>
                      <span>{order.provider._phone}</span>
                    </div>
                  )}
                  {order.provider._email && (
                    <div className="info-item">
                      <label>EMAIL</label>
                      <span style={{ textTransform: 'lowercase' }}>{order.provider._email}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <label>STATUS</label>
                    <span className={`status-badge ${getStatusClass(order.provider.status)}`}>
                      {order.provider.status}
                    </span>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <span>No provider assigned yet</span>
                </div>
              )}
            </div>
          )}

          {/* FINANCIALS TAB */}
          {activeTab === 'financials' && (
            <div className="financial-breakdown">
              <div className="financial-row">
                <label>Standard Service Base Fee</label>
                <span className="amount">{order.currency || 'SAR'} {order.base_price || '0.00'}</span>
              </div>
              <div className="financial-row">
                <label>Additional Add-ons & Equipment</label>
                <span className="amount">{order.currency || 'SAR'} {order.addons_total || '0.00'}</span>
              </div>
              <div className="financial-row total">
                <label>TOTAL PAYABLE AMOUNT</label>
                <span className="amount">{order.currency || 'SAR'} {order.total_price || '0.00'}</span>
              </div>
            </div>
          )}

          {/* MEDIA TAB */}
          {activeTab === 'media' && (
            <div className="media-section">
              {['BEFORE', 'AFTER'].map(type => {
                const photos = (order.media || []).filter(m => m.type === type)
                if (photos.length === 0) return null
                return (
                  <div key={type} className="media-group">
                    <h3 className="media-title">{type} PHOTOS</h3>
                    <div className="media-grid">
                      {photos.map(photo => (
                        <a key={photo.id} href={photo.file_url} target="_blank" rel="noopener noreferrer" className="media-item">
                          <img src={photo.file_url} alt={type} />
                        </a>
                      ))}
                    </div>
                  </div>
                )
              })}
              {(!order.media || order.media.length === 0) && (
                <div className="empty-state">
                  <span>No media uploaded for this order</span>
                </div>
              )}
            </div>
          )}

          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="timeline-section">
              {order.timeline && order.timeline.length > 0 ? (
                order.timeline.map((event, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className={`timeline-dot ${idx === 0 ? 'active' : ''}`} />
                    <div className="timeline-content">
                      <div className="timeline-time">{new Date(event.created_at).toLocaleString()}</div>
                      <div className="timeline-status">{event.status?.replace(/_/g, ' ')}</div>
                      {event.note && <div className="timeline-note">{event.note}</div>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <span>No history recorded</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {confirmCancel.open && (
        <div className="modal-overlay" onClick={() => setConfirmCancel({ open: false })}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon warning">
              <AlertTriangle size={32} />
            </div>
            <h3 className="modal-title">Cancel this order?</h3>
            <p className="modal-text">This action cannot be undone. The order will be marked as cancelled.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmCancel({ open: false })}>Keep order</button>
              <button className="btn-danger" onClick={handleConfirmCancelOrder}>Yes, cancel order</button>
            </div>
          </div>
        </div>
      )}

      {reassignState.open && (
        <div className="modal-overlay" onClick={() => setReassignState({ ...reassignState, open: false })}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon info">
              <UserCog size={32} />
            </div>
            <h3 className="modal-title">Reassign to Provider</h3>
            {reassignState.selectedName && (
              <p className="modal-selected">Selected: {reassignState.selectedName}</p>
            )}
            <form onSubmit={handleReassignSubmit} className="modal-form">
              <div className="search-box">
                <Filter size={16} />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={reassignState.spSearch}
                  onChange={(e) => setReassignState(prev => ({ ...prev, spSearch: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="provider-list">
                {reassignState.spLoading ? (
                  <div className="provider-loading">
                    <Loader2 size={18} className="spin" /> Loading providers...
                  </div>
                ) : (() => {
                  const q = reassignState.spSearch.toLowerCase()
                  const filtered = reassignState.spList.filter(sp => {
                    const name = sp.full_name || sp.name || ''
                    const phone = sp.phone || ''
                    return name.toLowerCase().includes(q) || phone.includes(q)
                  })
                  if (filtered.length === 0) return <div className="provider-empty">No providers found</div>
                  return filtered.map(sp => {
                    const id = sp.id || sp._id
                    const name = sp.full_name || sp.name || `SP-${id?.slice(0, 8)}`
                    const isSelected = reassignState.providerId === id
                    return (
                      <div
                        key={id}
                        className={`provider-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setReassignState(prev => ({ ...prev, providerId: id, selectedName: name, error: '' }))}
                      >
                        <div className="provider-info">
                          <span className="provider-name">{name}</span>
                          {sp.phone && <span className="provider-phone">{sp.phone}</span>}
                        </div>
                        {isSelected && <CheckCircle size={20} className="selected-icon" />}
                      </div>
                    )
                  })
                })()}
              </div>

              {reassignState.error && <p className="modal-error">{reassignState.error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setReassignState({ ...reassignState, open: false })}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={reassignState.submitting || !reassignState.providerId}>
                  {reassignState.submitting ? <><Loader2 size={16} className="spin" /> Reassigning…</> : 'Reassign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {messageModal.open && (
        <div className="modal-overlay" onClick={closeMessageModal}>
          <div className={`modal-dialog modal-${messageModal.type}`} onClick={(e) => e.stopPropagation()}>
            <div className={`modal-icon ${messageModal.type}`}>
              {messageModal.type === 'success' ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
            </div>
            <h3 className="modal-title">{messageModal.title}</h3>
            <p className="modal-text">{messageModal.message}</p>
            <div className="modal-actions">
              <button className="btn-primary" onClick={closeMessageModal}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderDetail
