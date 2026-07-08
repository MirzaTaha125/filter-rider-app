import { useState, useEffect } from 'react'
import { Plus, Search, X, Mail, Phone, Building2, Calendar, DollarSign, MapPin, Loader2 } from 'lucide-react'
import { signupCustomer, getCustomers, getCustomerDetails, updateCustomerStatus } from '../../../api'
import './CustomerManagement.css'

function CustomerManagement() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addCustomerSaving, setAddCustomerSaving] = useState(false)
  const [addCustomerError, setAddCustomerError] = useState('')
  const [newCustomerData, setNewCustomerData] = useState({
    fullName: '',
    email: '',
    phone: '',
    countryCode: 'SA',
    password: '',
    customerType: 'normal',
  })
  const [filters, setFilters] = useState({
    search: '',
    accountStatus: 'All Status',
    walletRange: 'All Ranges'
  })
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [customerToDisable, setCustomerToDisable] = useState(null)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [addCustomerSuccess, setAddCustomerSuccess] = useState(false)

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [orderHistoryCustomer, setOrderHistoryCustomer] = useState(null)
  const [orderHistory, setOrderHistory] = useState([])
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false)
  const [orderHistoryHasMore, setOrderHistoryHasMore] = useState(false)

  const itemsPerPage = 10

  useEffect(() => {
    fetchCustomers()
  }, [currentPage, filters.search, filters.accountStatus, filters.walletRange])

  const fetchCustomers = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getCustomers({
        page: currentPage,
        limit: itemsPerPage,
        search: filters.search,
        accountStatus: filters.accountStatus,
        walletRange: filters.walletRange
      })
      // The apiRequest already returns res.data
      if (Array.isArray(response)) {
        setCustomers(response)
        setTotalCustomers(response.length)
      } else if (response && response.customers) {
        setCustomers(response.customers)
        setTotalCustomers(response.total || response.customers.length)
      } else {
        setCustomers([])
      }
    } catch (err) {
      setError(err.message || 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const closeAddModal = () => {
    setIsAddModalOpen(false)
    setAddCustomerError('')
    setAddCustomerSuccess(false)
    if (addCustomerSuccess) fetchCustomers()
  }

  const handleAddCustomerInput = (field, value) => {
    setNewCustomerData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddCustomer = async () => {
    if (!newCustomerData.fullName || !newCustomerData.email || !newCustomerData.password) {
      setAddCustomerError('Full name, email and password are required.')
      return
    }
    setAddCustomerSaving(true)
    setAddCustomerError('')
    try {
      await signupCustomer(newCustomerData)
      setAddCustomerSuccess(true)
    } catch (err) {
      setAddCustomerError(err.message || 'Failed to add customer')
    } finally {
      setAddCustomerSaving(false)
    }
  }

  const handleRowClick = async (customer) => {
    setSelectedCustomer(customer)
    setIsModalOpen(true)
    setDetailsLoading(true)
    try {
      const details = await getCustomerDetails(customer.id)
      setSelectedCustomer(details)
    } catch (err) {
      console.error('Failed to load customer details:', err)
    } finally {
      setDetailsLoading(false)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedCustomer(null)
  }

  const handleDisable = (e, customer) => {
    e.stopPropagation()
    setCustomerToDisable(customer)
    setIsConfirmModalOpen(true)
  }

  const confirmDisable = async () => {
    if (customerToDisable) {
      setStatusUpdating(true)
      try {
        const newStatus = customerToDisable.status === 'Disabled' ? 'Active' : 'Disabled'
        await updateCustomerStatus(customerToDisable.id, newStatus)
        setIsConfirmModalOpen(false)
        setCustomerToDisable(null)
        fetchCustomers()
      } catch (err) {
        alert('Failed to update status: ' + err.message)
      } finally {
        setStatusUpdating(false)
      }
    }
  }

  const cancelDisable = () => {
    setIsConfirmModalOpen(false)
    setCustomerToDisable(null)
  }

  const handleViewHistory = async (e, customer) => {
    e.stopPropagation()
    setOrderHistoryCustomer(customer)
    setOrderHistory([])
    setOrderHistoryHasMore(false)
    setOrderHistoryLoading(true)
    try {
      const details = await getCustomerDetails(customer.id)
      const arr = Array.isArray(details?.orderHistory) ? details.orderHistory
        : Array.isArray(details?.orders) ? details.orders
        : Array.isArray(details?.order_history) ? details.order_history
        : []
      setOrderHistory(arr)
    } catch {
      setOrderHistory([])
    } finally {
      setOrderHistoryLoading(false)
    }
  }

  const loadMoreOrderHistory = async () => {}

  const closeOrderHistory = () => {
    setOrderHistoryCustomer(null)
    setOrderHistory([])
  }

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + customers.length

  return (
    <div className="customer-management">
      {/* Header */}
      <div className="customer-header">
        <div className="customer-header-content">
          <div>
            <h1 className="customer-title">Customer Management</h1>
            <p className="customer-subtitle">
              Manage and monitor your platform's customer base of {totalCustomers.toLocaleString()} active users.
            </p>
          </div>
        </div>
      </div>

      <div className="customer-filters-section">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input-customer"
            placeholder="Search by name, email, or phone number..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        <div className="filter-dropdowns">
          <div className="filter-dropdown">
            <select
              className="filter-select"
              value={filters.accountStatus}
              onChange={(e) => handleFilterChange('accountStatus', e.target.value)}
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Disabled</option>
            </select>
          </div>
          <div className="filter-dropdown">
            <select
              className="filter-select"
              value={filters.walletRange}
              onChange={(e) => handleFilterChange('walletRange', e.target.value)}
            >
              <option>All Ranges</option>
              <option>0-100</option>
              <option>100-500</option>
              <option>500-1000</option>
              <option>1000+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="customers-table-container">
        <table className="customers-table">
          <thead>
            <tr>
              <th>CUSTOMER PROFILE</th>
              <th>CONTACT INFO</th>
              <th>WALLET BALANCE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="loading-message">Loading customers...</td></tr>
            ) : error ? (
              <tr><td colSpan="4" className="api-error">{error}</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan="4" className="loading-message">No customers found.</td></tr>
            ) : (
              customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="table-row"
                  onClick={() => handleRowClick(customer)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="customer-profile-column">
                    <div className="customer-profile-cell">
                      {customer.accountType === 'CORPORATE' ? (
                        <div className="customer-avatar corporate">
                          <Building2 size={20} />
                        </div>
                      ) : (
                        <div className="customer-avatar">
                          {customer.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'C'}
                        </div>
                      )}
                      <div className="customer-info">
                        <div className="customer-name">{customer.name}</div>
                        <div className="customer-id">#{customer.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="contact-info-column">
                    <div className="contact-info-cell">
                      <div className="contact-item">
                        <Mail size={14} />
                        <span>{customer.email}</span>
                      </div>
                      <div className="contact-item">
                        <Phone size={14} />
                        <span>{customer.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="wallet-balance-column">
                    <div className="wallet-balance">
                      <span className="riyal-symbol">&#x20C1;</span>
                      {(customer.walletBalance || customer.wallet_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="actions-column" onClick={(e) => e.stopPropagation()}>
                    <div className="actions-cell">
                      <button className="action-link" onClick={(e) => handleViewHistory(e, customer)}>
                        VIEW HISTORY
                      </button>
                      <button
                        className={`action-link ${customer.status === 'Disabled' ? 'enable' : 'disable'}`}
                        onClick={(e) => handleDisable(e, customer)}
                      >
                        {customer.status === 'Disabled' ? 'ENABLE' : 'DISABLE'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <div className="pagination-info">
          SHOWING {startIndex + 1}-{Math.min(endIndex, totalCustomers)} OF {totalCustomers.toLocaleString()}
        </div>
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || loading}
          >
            ‹
          </button>
          {[...Array(Math.ceil(totalCustomers / itemsPerPage))].map((_, i) => (
            <button
              key={i}
              className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
              onClick={() => setCurrentPage(i + 1)}
              disabled={loading}
            >
              {i + 1}
            </button>
          )).slice(Math.max(0, currentPage - 3), Math.min(Math.ceil(totalCustomers / itemsPerPage), currentPage + 2))}
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage >= Math.ceil(totalCustomers / itemsPerPage) || loading}
          >
            ›
          </button>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {isModalOpen && selectedCustomer && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">Customer Details</h2>
                <span className="modal-customer-id">#{selectedCustomer.id}</span>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {detailsLoading ? (
                <div className="loading-state">
                  <Loader2 className="animate-spin" size={40} />
                  <p>Loading customer details...</p>
                </div>
              ) : (
                <>
                  {/* Customer Profile */}
                  <div className="modal-section">
                    <h3 className="modal-section-title">Customer Profile</h3>
                    <div className="modal-info-grid">
                      <div className="modal-info-item">
                        <label>Name</label>
                        <div className="modal-user-info">
                          {selectedCustomer.accountType === 'CORPORATE' ? (
                            <div className="customer-avatar corporate">
                              <Building2 size={20} />
                            </div>
                          ) : (
                            <div className="customer-avatar">
                              {selectedCustomer.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'C'}
                            </div>
                          )}
                          <span>{selectedCustomer.name}</span>
                        </div>
                      </div>
                      <div className="modal-info-item">
                        <label>Status</label>
                        <span className={`status-badge ${selectedCustomer.status === 'Active' ? 'active' : 'inactive'}`}>
                          {selectedCustomer.status}
                        </span>
                      </div>
                      <div className="modal-info-item">
                        <label>Join Date</label>
                        <div className="modal-contact">
                          <Calendar size={16} />
                          <span>{new Date(selectedCustomer.created_at || selectedCustomer.joinDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="modal-section">
                    <h3 className="modal-section-title">Contact Information</h3>
                    <div className="modal-info-grid">
                      <div className="modal-info-item">
                        <label>Email</label>
                        <div className="modal-contact">
                          <Mail size={16} />
                          <span>{selectedCustomer.email}</span>
                        </div>
                      </div>
                      <div className="modal-info-item">
                        <label>Phone</label>
                        <div className="modal-contact">
                          <Phone size={16} />
                          <span>{selectedCustomer.phone || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="modal-info-item full-width">
                        <label>Address</label>
                        <div className="modal-contact">
                          <MapPin size={16} />
                          <span>{selectedCustomer.address || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Information */}
                  <div className="modal-section">
                    <h3 className="modal-section-title">Financial Information</h3>
                    <div className="modal-info-grid">
                      <div className="modal-info-item">
                        <label>Wallet Balance</label>
                        <div className="modal-contact">
                          <DollarSign size={16} />
                          <span className="modal-price">
                            <span className="riyal-symbol">&#x20C1;</span>
                            {(selectedCustomer.walletBalance || selectedCustomer.wallet_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      <div className="modal-info-item">
                        <label>Total Orders</label>
                        <span>{selectedCustomer.totalOrders || selectedCustomer.total_orders || 0}</span>
                      </div>
                      <div className="modal-info-item">
                        <label>Total Spent</label>
                        <div className="modal-contact">
                          <DollarSign size={16} />
                          <span className="modal-price">
                            <span className="riyal-symbol">&#x20C1;</span>
                            {(selectedCustomer.totalSpent || selectedCustomer.total_spent || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-action-secondary" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Customer</h2>
              <button className="modal-close-btn" onClick={closeAddModal}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              {addCustomerSuccess ? (
                <div className="success-state">
                  <div className="success-icon-wrapper">
                    <div className="success-icon-circle">
                      <Plus size={32} className="success-icon rotate-45" />
                    </div>
                  </div>
                  <h3 className="success-title">Success!</h3>
                  <p className="success-message">Customer has been registered successfully.</p>
                </div>
              ) : (
                <>
                  {addCustomerError && <p className="api-error">{addCustomerError}</p>}
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter full name"
                      value={newCustomerData.fullName}
                      onChange={(e) => handleAddCustomerInput('fullName', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="Enter email"
                      value={newCustomerData.email}
                      onChange={(e) => handleAddCustomerInput('email', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="+966 50 123 4567"
                      value={newCustomerData.phone}
                      onChange={(e) => handleAddCustomerInput('phone', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Password *</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Enter password"
                      value={newCustomerData.password}
                      onChange={(e) => handleAddCustomerInput('password', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              {addCustomerSuccess ? (
                <button className="btn-action-primary full-width" onClick={closeAddModal}>
                  OK
                </button>
              ) : (
                <>
                  <button className="btn-action-secondary" onClick={closeAddModal}>
                    Cancel
                  </button>
                  <button
                    className="btn-action-primary"
                    onClick={handleAddCustomer}
                    disabled={addCustomerSaving}
                  >
                    {addCustomerSaving ? 'Adding...' : 'Add Customer'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order History Modal */}
      {orderHistoryCustomer && (
        <div className="modal-overlay history-modal-overlay" onClick={closeOrderHistory}>
          <div className="modal-content history-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '1rem' }}>
              <div>
                <h2 className="modal-title" style={{ fontSize: '1.1rem' }}>Order History</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>{orderHistoryCustomer.name}</p>
              </div>
              <button className="modal-close-btn" onClick={closeOrderHistory}><X size={20} /></button>
            </div>
            
            <div className="modal-body custom-scrollbar">
              {orderHistoryLoading && orderHistory.length === 0 ? (
                <div className="loading-state">
                  <Loader2 className="animate-spin" size={32} />
                  <p>Loading orders...</p>
                </div>
              ) : orderHistory.length === 0 ? (
                <div className="loading-state">No orders found.</div>
              ) : (
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table className="customers-table simple-history-table">
                    <thead>
                      <tr>
                        <th>ORDER ID</th>
                        <th>DATE</th>
                        <th>SERVICE</th>
                        <th>STATUS</th>
                        <th>AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderHistory.map((order) => {
                        const status = (order.status ?? '').toLowerCase()
                        return (
                          <tr key={order.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{order.orderNo ?? order.order_no ?? `#${(order.id ?? '').slice(0, 8)}`}</td>
                            <td>{(order.date ?? order.created_at) ? new Date(order.date ?? order.created_at).toLocaleDateString() : '—'}</td>
                            <td>{order.serviceName ?? order.service_name ?? order.service?.name_en ?? order.service?.name ?? '—'}</td>
                            <td>
                              <span className={`status-badge ${status}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                {order.status ?? '—'}
                              </span>
                            </td>
                            <td>
                              <span className="riyal-symbol">&#x20C1;</span>
                              {Number(order.totalAmount ?? order.total_amount ?? order.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              {orderHistoryHasMore && (
                <div className="pagination-info" style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button className="btn-action-secondary" onClick={loadMoreOrderHistory} disabled={orderHistoryLoading}>
                    {orderHistoryLoading ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn-action-secondary" onClick={closeOrderHistory}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && customerToDisable && (
        <div className="modal-overlay" onClick={cancelDisable}>
          <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h2 className="confirm-modal-title">
                Confirm {customerToDisable.status === 'Disabled' ? 'Enable' : 'Disable'}
              </h2>
              <button className="modal-close-btn" onClick={cancelDisable}>
                <X size={24} />
              </button>
            </div>
            <div className="confirm-modal-body">
              <p className="confirm-modal-message">
                Are you sure you want to {customerToDisable.status === 'Disabled' ? 'enable' : 'disable'} <strong>{customerToDisable.full_name}</strong>?
              </p>
              <p className="confirm-modal-submessage">
                {customerToDisable.status === 'Disabled'
                  ? 'This will restore the customer\'s access to their account.'
                  : 'This action will prevent the customer from accessing their account.'}
              </p>
            </div>
            <div className="confirm-modal-footer">
              <button className="btn-action-secondary" onClick={cancelDisable}>
                Cancel
              </button>
              <button
                className={`btn-confirm-disable ${customerToDisable.status === 'Disabled' ? 'enable' : ''}`}
                onClick={confirmDisable}
                disabled={statusUpdating}
              >
                {statusUpdating ? 'Updating...' : customerToDisable.status === 'Disabled' ? 'Enable Customer' : 'Disable Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerManagement

