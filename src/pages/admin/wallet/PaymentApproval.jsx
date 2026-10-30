import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Wallet, ChevronRight, Building2, User,
} from 'lucide-react'
import { getPaymentApprovals } from '../../../api'
import {
  WITHDRAWAL_STATUS_TABS,
  ownerName,
  ownerRoleLabel,
  ownerType,
  bankLabel,
  accountLabel,
  formatMoney,
  formatDate,
  statusTone,
  unwrapList,
} from './withdrawals.js'
import './PaymentApproval.css'
import SortableTh from '../../../components/DataTable/SortableTh'
import { useTableSort } from '../../../components/DataTable/useTableSort'
import TableScroll from '../../../components/DataTable/TableScroll'
import Pager from '../../../components/DataTable/Pager'
import { TableBlockShimmer } from '../../../components/Shimmer/Shimmer'


function PaymentApproval() {
  const navigate = useNavigate()

  const [status, setStatus] = useState('PENDING')
  const [items, setItems] = useState([])
  const sort = useTableSort()
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tabCounts, setTabCounts] = useState({})

  const load = useCallback(async (pageNo) => {
    setLoading(true)
    setError('')
    try {
      const data = await getPaymentApprovals({ status, page: pageNo, limit })
      const { items: rows, total: count } = unwrapList(data)
      setItems(rows)
      setTotal(count)
    } catch (err) {
      setError(err.message || 'Failed to load payment approvals')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [status, limit])

  useEffect(() => { load(page) }, [load, page])

  useEffect(() => {
    if (loading) return
    setTabCounts((prev) => (prev[status] === total ? prev : { ...prev, [status]: total }))
  }, [loading, status, total])

  // Only the visible page is summed, so label it as such rather than implying
  // it is the total across every page.
  const pageTotal = items.reduce((sum, i) => sum + Number(i.amount || 0), 0)

  const sortedItems = sort.apply(items, {
    requester: (i) => ownerName(i),
    role: (i) => ownerRoleLabel(i),
    bank: (i) => bankLabel(i),
    amount: (i) => Number(i.amount ?? 0),
    requested: (i) => new Date(i.requested_at ?? 0).getTime(),
    status: (i) => i.status,
  })

  return (
    <div className="payment-approval">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">Provider and customer withdrawal requests awaiting review.</p>
        </div>
      </header>

      <div className="pv-stats">
        <div className="pv-stat">
          <span className="pv-stat-label">{status} requests</span>
          <span className="pv-stat-value">{loading ? '—' : total.toLocaleString()}</span>
        </div>
        <div className="pv-stat">
          <span className="pv-stat-label">Value on this page</span>
          <span className="pv-stat-value">
            {loading
              ? '—'
              : <><span className="riyal-symbol">&#x20C1;</span>{formatMoney(pageTotal)}</>}
          </span>
        </div>
      </div>

      <div className="pv-tabs" role="tablist">
        {WITHDRAWAL_STATUS_TABS.map(s => (
          <button
            key={s}
            role="tab"
            aria-selected={status === s}
            className={`pv-tab ${status === s ? 'is-active' : ''}`}
            onClick={() => { setStatus(s); setPage(1) }}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
            {tabCounts[s] != null && <span className="tab-count">{tabCounts[s]}</span>}
          </button>
        ))}
      </div>

      {error && (
        <div className="pv-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <TableBlockShimmer columns={6} />
      ) : items.length === 0 ? (
        <div className="dt-empty">
          <Wallet size={32} />
          <h2>Nothing here</h2>
          <p>No {status.toLowerCase()} withdrawal requests.</p>
        </div>
      ) : (
        <>
          <div className="dt-card">
            <TableScroll>
              <table className="dt-table">
                <thead>
                  <tr>
                    <SortableTh sortKey="requester" sort={sort}>Requester</SortableTh>
                    <SortableTh sortKey="bank" sort={sort}>Bank</SortableTh>
                    <SortableTh sortKey="amount" sort={sort}>Amount</SortableTh>
                    <SortableTh sortKey="requested" sort={sort}>Requested</SortableTh>
                    <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
                    <th aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map(item => (
                    <tr
                      key={item.id}
                      className="is-clickable"
                      onClick={() => navigate(`/admin/wallet/payment-approval/${item.id}`)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/admin/wallet/payment-approval/${item.id}`)
                        }
                      }}
                    >
                      <td>
                        <span className="pv-provider">
                          {ownerType(item) === 'CUSTOMER' ? <User size={15} /> : <Building2 size={15} />}
                          <span>
                            <strong>{ownerName(item)}</strong>
                            <em>
                              {ownerRoleLabel(item)}
                              {item.request_no ? ` · ${item.request_no}` : ''}
                            </em>
                          </span>
                        </span>
                      </td>
                      <td className="dt-muted">
                        {bankLabel(item)}
                        <span className="pv-account">{accountLabel(item)}</span>
                      </td>
                      <td className="pv-amount">
                        <span className="riyal-symbol">&#x20C1;</span>{formatMoney(item.amount)}
                      </td>
                      <td className="dt-muted">{formatDate(item.requested_at)}</td>
                      <td>
                        <span className={`dt-status dt-status--${statusTone(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="dt-col-actions"><ChevronRight size={16} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <Pager
              page={page}
              total={total}
              limit={limit}
              onChange={setPage}
              onLimitChange={(n) => { setLimit(n); setPage(1) }}
              unit="requests"
              disabled={loading}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default PaymentApproval
