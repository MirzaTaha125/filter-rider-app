import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Mail, Phone, Building2 } from 'lucide-react'
import { getCustomers } from '../../../api'
import './CustomerManagement.css'

function CustomerManagement() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    search: '',
    accountStatus: 'All Status',
    walletRange: 'All Ranges'
  })
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
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

  const handleRowClick = (customer) => {
    navigate(`/admin/customers/${customer.id}`)
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
          <button
            className="btn-add-customer"
            onClick={() => navigate('/admin/customers/add')}
          >
            <Plus size={18} />
            Add Customer
          </button>
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
              <th>STATUS</th>
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
                  <td className="status-column">
                    <span className={`status-badge ${customer.status === 'Active' ? 'active' : 'inactive'}`}>
                      {customer.status}
                    </span>
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
    </div>
  )
}

export default CustomerManagement
