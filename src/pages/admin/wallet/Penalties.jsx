import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, AlertTriangle, Plus, Check, Ban, Search, ScrollText,
} from 'lucide-react'
import {
  getPenalties,
  approvePenalty,
  waivePenalty,
} from '../../../api'
import { formatMoney, formatDate, unwrapList } from './withdrawals.js'
import './PaymentApproval.css'
import './Penalties.css'
import SortableTh from '../../../components/DataTable/SortableTh'
import { useTableSort } from '../../../components/DataTable/useTableSort'
import TableScroll from '../../../components/DataTable/TableScroll'
import { usePermissions } from '../../../contexts/PermissionsContext'

const PAGE_SIZE = 20
const STATUS_TABS = ['ALL', 'PENDING', 'ACTIVE', 'WAIVED', 'PAID']

function statusTone(status) {
  switch (status) {
    case 'ACTIVE':
    case 'PAID':
      return 'success'
    case 'WAIVED':
      return 'muted'
    case 'PENDING':
      return 'pending'
    default:
      return 'neutral'
  }
}

function Penalties() {
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const canCreate = hasPermission('wallet.penalties.create')

  const [status, setStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [items, setItems] = useState([])
  const sort = useTableSort()
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setSearchApplied(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async (nextPage, replace) => {
    replace ? setLoading(true) : setLoadingMore(true)
    setError('')
    try {
      const data = await getPenalties({
        status: status === 'ALL' ? undefined : status,
        search: searchApplied || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      })
      const { items: rows, total: count } = unwrapList(data)
      setItems(prev => (replace ? rows : [...prev, ...rows]))
      setTotal(count)
      setPage(nextPage)
    } catch (err) {
      setError(err.message || 'Failed to load penalties')
      if (replace) setItems([])
    } finally {
      replace ? setLoading(false) : setLoadingMore(false)
    }
  }, [status, searchApplied])

  useEffect(() => { load(1, true) }, [load])

  const hasMore = items.length < total

  const handleApprove = async (id) => {
    setActionLoading(id)
    try {
      await approvePenalty(id)
      await load(1, true)
    } catch (e) {
      alert(e.message || 'Failed to approve')
    } finally {
      setActionLoading(null)
    }
  }

  const handleWaive = async (id) => {
    const notes = prompt('Waive reason / notes (optional):') ?? ''
    if (notes === null) return
    setActionLoading(id)
    try {
      await waivePenalty(id, notes)
      await load(1, true)
    } catch (e) {
      alert(e.message || 'Failed to waive')
    } finally {
      setActionLoading(null)
    }
  }

  const sortedItems = sort.apply(items, {
    order: (i) => i.order?.order_no,
    rider: (i) => i.provider?.user?.full_name,
    customer: (i) => i.customer?.user?.full_name,
    penalty: (i) => Number(i.penalty_amount ?? 0),
    reward: (i) => Number(i.customer_reward_amount ?? 0),
    retained: (i) => Number(i.platform_retained_amount ?? 0),
    status: (i) => i.status,
    created: (i) => new Date(i.created_at ?? 0).getTime(),
  })

  return (
    <div className="payment-approval penalties-page">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">
            Apply rider penalties on completed orders. Rider is debited; customer may receive a reward; platform keeps the residual.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            className="penalties-apply-btn"
            onClick={() => navigate('/admin/wallet/penalties/apply')}
          >
            <Plus size={16} /> Apply Penalty
          </button>
        )}
      </header>

      <div className="pv-stats">
        <div className="pv-stat">
          <span className="pv-stat-label">{status === 'ALL' ? 'All' : status} penalties</span>
          <span className="pv-stat-value">{loading ? '—' : total.toLocaleString()}</span>
        </div>
      </div>

      <div className="pv-tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`pv-tab ${status === tab ? 'is-active' : ''}`}
            onClick={() => setStatus(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="penalties-search">
        <Search size={16} />
        <input
          type="search"
          placeholder="Search order, rider, customer, reason…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="pv-alert">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="dt-empty">
          <Loader2 size={32} className="spin" />
          <span>Loading penalties…</span>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="dt-empty">
          <ScrollText size={32} />
          <h2>No penalties found</h2>
          <p>
            {status === 'ALL'
              ? 'Apply a penalty on a completed order to see it here.'
              : `No ${status.toLowerCase()} penalties yet.`}
          </p>
        </div>
      ) : (
        <>
          <div className="dt-card">
            <TableScroll>
              <table className="dt-table penalties-table">
                <thead>
                  <tr>
                    <SortableTh sortKey="order" sort={sort}>Order</SortableTh>
                    <SortableTh sortKey="rider" sort={sort}>Rider</SortableTh>
                    <SortableTh sortKey="customer" sort={sort}>Customer</SortableTh>
                    <SortableTh sortKey="penalty" sort={sort} className="tl-num">Penalty</SortableTh>
                    <SortableTh sortKey="reward" sort={sort} className="tl-num">Reward</SortableTh>
                    <SortableTh sortKey="retained" sort={sort} className="tl-num">Platform</SortableTh>
                    <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
                    <SortableTh sortKey="created" sort={sort}>Created</SortableTh>
                    <th>Reason</th>
                    {canCreate && <th aria-label="Actions" />}
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.order?.order_no || '—'}</strong>
                      </td>
                      <td>
                        <span className="penalties-party">
                          <strong>{row.provider?.user?.full_name || '—'}</strong>
                          {row.provider?.user?.email && (
                            <em>{row.provider.user.email}</em>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="penalties-party">
                          <strong>{row.customer?.user?.full_name || '—'}</strong>
                          {row.customer?.user?.email && (
                            <em>{row.customer.user.email}</em>
                          )}
                        </span>
                      </td>
                      <td className="tl-num pv-amount">
                        <span className="riyal-symbol">&#x20C1;</span>
                        {formatMoney(row.penalty_amount)}
                      </td>
                      <td className="tl-num pv-amount">
                        <span className="riyal-symbol">&#x20C1;</span>
                        {formatMoney(row.customer_reward_amount)}
                      </td>
                      <td className="tl-num pv-amount">
                        <span className="riyal-symbol">&#x20C1;</span>
                        {formatMoney(row.platform_retained_amount)}
                      </td>
                      <td>
                        <span className={`dt-status dt-status--${statusTone(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="dt-muted">{formatDate(row.created_at, true)}</td>
                      <td>
                        <span className="penalties-reason" title={row.reason}>
                          {row.reason || '—'}
                        </span>
                      </td>
                      {canCreate && (
                        <td className="penalties-actions">
                          {row.status === 'PENDING' && (
                            <button
                              type="button"
                              className="penalties-icon-btn"
                              title="Approve"
                              disabled={actionLoading === row.id}
                              onClick={() => handleApprove(row.id)}
                            >
                              {actionLoading === row.id
                                ? <Loader2 size={14} className="spin" />
                                : <Check size={14} />}
                            </button>
                          )}
                          {(row.status === 'PENDING' || row.status === 'ACTIVE') && (
                            <button
                              type="button"
                              className="penalties-icon-btn is-danger"
                              title="Waive"
                              disabled={actionLoading === row.id}
                              onClick={() => handleWaive(row.id)}
                            >
                              <Ban size={14} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </div>

          {hasMore && (
            <div className="pv-more">
              <button
                type="button"
                className="dt-btn"
                disabled={loadingMore}
                onClick={() => load(page + 1, false)}
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

export default Penalties
