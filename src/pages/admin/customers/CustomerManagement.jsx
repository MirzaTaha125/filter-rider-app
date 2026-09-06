import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
// Plus is only used by the commented-out "Add customer" button below.
import { Search, Phone, Building2 } from 'lucide-react'
import { getCustomers } from '../../../api'
import Pager from '../../../components/DataTable/Pager'
import SortableTh from '../../../components/DataTable/SortableTh'
import { useTableSort } from '../../../components/DataTable/useTableSort'
import './CustomerManagement.css'
import TableScroll from '../../../components/DataTable/TableScroll'

function CustomerManagement() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    search: '',
    accountStatus: 'All Status',
    walletRange: 'All Ranges'
  })
  const sort = useTableSort()
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

  // Pager derives the "showing x – y" range itself now.

  // Wallet sorts on the number behind the formatted amount. The endpoint is
  // paginated server-side, so this orders the page that is loaded.
  const sortedCustomers = sort.apply(customers, {
    name: (c) => c.name,
    contact: (c) => c.phone,
    wallet: (c) => Number(c.walletBalance ?? c.wallet_balance ?? 0),
    status: (c) => c.status,
  })

  return (
    <div className="dt-page-layout">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">
            Manage and monitor your platform&apos;s customer base of{' '}
            {totalCustomers.toLocaleString()} accounts.
          </p>
        </div>
        {/* Hidden for now — the /admin/customers/add route and its form are
            still in place, so restoring this is just uncommenting it (and the
            Plus icon import above).
        <button className="dt-btn dt-btn--primary" onClick={() => navigate('/admin/customers/add')}>
          <Plus size={16} />
          Add customer
        </button>
        */}
      </header>

      <div className="dt-card">
        <div className="dt-toolbar">
          <div className="dt-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search by name, email or phone…"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          <div className="dt-toolbar-actions">
            <div className="dt-field">
              <select
                value={filters.accountStatus}
                onChange={(e) => handleFilterChange('accountStatus', e.target.value)}
                aria-label="Account status"
              >
                <option>All Status</option>
                <option>Active</option>
                <option>Disabled</option>
              </select>
            </div>
            <div className="dt-field">
              <select
                value={filters.walletRange}
                onChange={(e) => handleFilterChange('walletRange', e.target.value)}
                aria-label="Wallet range"
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

        <TableScroll>
          <table className="dt-table" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <SortableTh sortKey="name" sort={sort}>Customer</SortableTh>
                <SortableTh sortKey="contact" sort={sort}>Phone</SortableTh>
                <SortableTh sortKey="wallet" sort={sort}>Wallet balance</SortableTh>
                <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="dt-state">Loading customers…</td></tr>
              ) : error ? (
                <tr><td colSpan="4" className="dt-state dt-state--error">{error}</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan="4" className="dt-state">No customers match this view.</td></tr>
              ) : (
                sortedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="is-clickable"
                    onClick={() => handleRowClick(customer)}
                  >
                    <td>
                      <div className="cm-profile">
                        <div className={`cm-avatar ${customer.accountType === 'CORPORATE' ? 'is-corporate' : ''}`}>
                          {customer.accountType === 'CORPORATE'
                            ? <Building2 size={18} />
                            : (customer.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'C')}
                        </div>
                        <div className="dt-cell-stack">
                          <strong>{customer.name}</strong>
                          <em>#{customer.id}</em>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="cm-contact">
                        <Phone size={13} />{customer.phone || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <strong>
                        <span className="riyal-symbol">&#x20C1;</span>
                        {(customer.walletBalance || customer.wallet_balance || 0)
                          .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </td>
                    <td>
                      <span className={`dt-status dt-status--${customer.status === 'Active' ? 'success' : 'neutral'}`}>
                        {customer.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableScroll>

        <Pager
          page={currentPage}
          total={totalCustomers}
          limit={itemsPerPage}
          onChange={setCurrentPage}
          unit="customers"
          disabled={loading}
        />
      </div>
    </div>
  )
}

export default CustomerManagement
