import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, AlertTriangle, Wallet, ChevronRight, Building2,
} from 'lucide-react'
import { getPaymentApprovals } from '../../../api'
import {
  WITHDRAWAL_STATUS_TABS,
  providerName,
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

const PAGE_SIZE = 20

function PaymentApproval() {
  const navigate = useNavigate()

  const [status, setStatus] = useState('PENDING')
  const [items, setItems] = useState([])
  const sort = useTableSort()
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (nextPage, replace) => {
    replace ? setLoading(true) : setLoadingMore(true)
    setError('')
    try {
      const data = await getPaymentApprovals({ status, page: nextPage, limit: PAGE_SIZE })
      const { items: rows, total: count } = unwrapList(data)
      setItems(prev => (replace ? rows : [...prev, ...rows]))
      setTotal(count)
      setPage(nextPage)
    } catch (err) {
      setError(err.message || 'Failed to load payment approvals')
      if (replace) setItems([])
    } finally {
      replace ? setLoading(false) : setLoadingMore(false)
    }
  }, [status])

  useEffect(() => { load(1, true) }, [load])

  const hasMore = items.length < total

  // Only the visible page is summed, so label it as such rather than implying
  // it is the total across every page.
  const pageTotal = items.reduce((sum, i) => sum + Number(i.amount || 0), 0)

  const sortedItems = sort.apply(items, {
    provider: (i) => providerName(i),
    bank: (i) => bankLabel(i),
    amount: (i) => Number(i.amount ?? 0),
    requested: (i) => new Date(i.requested_at ?? 0).getTime(),
    status: (i) => i.status,
  })

  return (
    <div className="payment-approval">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">Provider withdrawal requests awaiting review.</p>
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
            onClick={() => setStatus(s)}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
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
        <div className="dt-empty">
          <Loader2 size={32} className="spin" />
          <span>Loading requests…</span>
        </div>
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
                    <SortableTh sortKey="provider" sort={sort}>Provider</SortableTh>
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
                          <Building2 size={15} />
                          <span>
                            <strong>{providerName(item)}</strong>
                            <em>{item.request_no ?? ''}</em>
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
          </div>

          {hasMore && (
            <div className="pv-more">
              <button
                className="dt-btn"
                onClick={() => load(page + 1, false)}
                disabled={loadingMore}
              >
                {loadingMore
                  ? <><Loader2 size={16} className="spin" /> Loading…</>
                  : `Load more (${items.length} of ${total})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default PaymentApproval
