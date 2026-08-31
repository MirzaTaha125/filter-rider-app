import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getCustomerDetails, updateCustomerStatus } from '../../../api'
import PageHeader from '../../../components/PageHeader/PageHeader'
import { Loader2, Building2, Mail, Phone, MapPin, DollarSign, Calendar, AlertTriangle } from 'lucide-react'
import './CustomerDetail.css'

function CustomerDetail() {
  const { customerId } = useParams()
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: '' })
  const [displayOrderCount, setDisplayOrderCount] = useState(5)

  useEffect(() => {
    loadCustomerDetails()
  }, [customerId])

  async function loadCustomerDetails() {
    setLoading(true)
    setError('')
    try {
      const details = await getCustomerDetails(customerId)
      setCustomer(details)
    } catch (err) {
      setError(err.message || 'Failed to load customer details')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (newStatus) => {
    setConfirmDialog({ open: true, action: newStatus })
  }

  const confirmStatusChange = async () => {
    if (!customer) return
    setStatusUpdating(true)
    try {
      await updateCustomerStatus(customer.id, confirmDialog.action)
      setConfirmDialog({ open: false, action: '' })
      loadCustomerDetails()
    } catch (err) {
      setError(err.message || 'Failed to update status')
    } finally {
      setStatusUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="customer-detail-loading">
        <Loader2 size={40} className="spin" />
        <span>Loading customer details...</span>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="customer-detail-error">
        <AlertTriangle size={40} />
        <h2>Error Loading Customer</h2>
        <p>{error || 'Customer not found'}</p>
      </div>
    )
  }

  const statusColor = customer.status === 'Active' ? 'active' : 'inactive'

  return (
    <div className="customer-detail-page">
      <PageHeader
        title={customer.name}
        subtitle={`Customer ID: ${customer.id}`}
      />

      <div className="detail-container">
        {/* Status Bar */}
        <div className="status-bar">
          <div className="status-info">
            <span className={`status-badge ${statusColor}`}>
              {customer.status}
            </span>
          </div>
          <div className="status-actions">
            {customer.status === 'Active' ? (
              <button
                className="btn-disable"
                onClick={() => handleStatusChange('Disabled')}
                disabled={statusUpdating}
              >
                Disable Account
              </button>
            ) : (
              <button
                className="btn-enable"
                onClick={() => handleStatusChange('Active')}
                disabled={statusUpdating}
              >
                Enable Account
              </button>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="detail-grid">
          {/* Profile Section */}
          <div className="detail-card">
            <h3 className="card-title">Customer Profile</h3>
            <div className="card-content">
              <div className="info-row">
                <span className="info-label">Name</span>
                <div className="info-value-with-icon">
                  {customer.accountType === 'CORPORATE' ? (
                    <Building2 size={18} />
                  ) : null}
                  <span>{customer.name}</span>
                </div>
              </div>
              <div className="info-row">
                <span className="info-label">Account Type</span>
                <span className="info-value">{customer.accountType === 'CORPORATE' ? 'Corporate' : 'Personal'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Join Date</span>
                <div className="info-value-with-icon">
                  <Calendar size={18} />
                  <span>{new Date(customer.created_at || customer.joinDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="detail-card">
            <h3 className="card-title">Contact Information</h3>
            <div className="card-content">
              <div className="info-row">
                <span className="info-label">Email</span>
                <div className="info-value-with-icon">
                  <Mail size={18} />
                  <span>{customer.email}</span>
                </div>
              </div>
              <div className="info-row">
                <span className="info-label">Phone</span>
                <div className="info-value-with-icon">
                  <Phone size={18} />
                  <span>{customer.phone || 'N/A'}</span>
                </div>
              </div>
              {customer.address && (
                <div className="info-row">
                  <span className="info-label">Address</span>
                  <div className="info-value-with-icon">
                    <MapPin size={18} />
                    <span>{customer.address}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Information */}
          <div className="detail-card">
            <h3 className="card-title">Financial Information</h3>
            <div className="card-content">
              <div className="info-row">
                <span className="info-label">Wallet Balance</span>
                <div className="info-value-with-icon">
                  <DollarSign size={18} />
                  <span className="currency-value">
                    <span className="riyal-symbol">&#x20C1;</span>
                    {(customer.walletBalance || customer.wallet_balance || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              </div>
              <div className="info-row">
                <span className="info-label">Total Orders</span>
                <span className="info-value">{customer.totalOrders || customer.total_orders || 0}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Total Spent</span>
                <div className="info-value-with-icon">
                  <DollarSign size={18} />
                  <span className="currency-value">
                    <span className="riyal-symbol">&#x20C1;</span>
                    {(customer.totalSpent || customer.total_spent || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Order History */}
          {customer.orderHistory && customer.orderHistory.length > 0 && (
            <div className="detail-card full-width">
              <h3 className="card-title">Recent Orders</h3>
              <div className="orders-list">
                {customer.orderHistory.slice(0, displayOrderCount).map((order, idx) => (
                  <div key={idx} className="order-item">
                    <div className="order-info">
                      <div className="order-id">{order.order_no || `Order #${order.id?.slice(0, 8)}`}</div>
                      <div className="order-date">{new Date(order.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="order-amount">
                      <span className="riyal-symbol">&#x20C1;</span>
                      {(order.total_price || order.amount || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {displayOrderCount < customer.orderHistory.length && (
                <button
                  className="btn-load-more"
                  onClick={() => setDisplayOrderCount(prev => prev + 5)}
                >
                  Load More Orders
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.open && (
        <div className="dialog-overlay" onClick={() => setConfirmDialog({ open: false, action: '' })}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-icon warning">
              <AlertTriangle size={32} />
            </div>
            <h3 className="dialog-title">
              {confirmDialog.action === 'Disabled' ? 'Disable Account?' : 'Enable Account?'}
            </h3>
            <p className="dialog-text">
              {confirmDialog.action === 'Disabled'
                ? 'This customer will not be able to place new orders. Are you sure?'
                : 'This customer will be able to place orders again. Are you sure?'}
            </p>
            <div className="dialog-actions">
              <button
                className="btn-secondary"
                onClick={() => setConfirmDialog({ open: false, action: '' })}
                disabled={statusUpdating}
              >
                Cancel
              </button>
              <button
                className={`btn-action ${confirmDialog.action === 'Disabled' ? 'danger' : 'primary'}`}
                onClick={confirmStatusChange}
                disabled={statusUpdating}
              >
                {statusUpdating ? <><Loader2 size={16} className="spin" /> Updating...</> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerDetail
