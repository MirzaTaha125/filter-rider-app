import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, AlertTriangle, ScrollText, ArrowDownLeft, ArrowUpRight, Search,
} from 'lucide-react'
import { getWalletLedger } from '../../../api'
import { formatMoney, formatDate, unwrapList } from './walletFormat.js'
import {
  LEDGER_TYPES,
  typeLabel,
  counterparty,
  referenceLabel,
  isCredit,
  transactionStatusTone,
} from './ledger.js'
import './TransactionLedger.css'

const PAGE_SIZE = 20

function TransactionLedger() {
  const [type, setType] = useState('')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [totalVolume, setTotalVolume] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (nextPage, replace) => {
    replace ? setLoading(true) : setLoadingMore(true)
    setError('')
    try {
      const data = await getWalletLedger({
        type: type || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      })
      const { items: rows, total: count } = unwrapList(data)
      setItems(prev => (replace ? rows : [...prev, ...rows]))
      setTotal(count)
      // The API aggregates net_amount across every matching row, not just this page.
      setTotalVolume(data?.total_volume ?? null)
      setPage(nextPage)
    } catch (err) {
      setError(err.message || 'Failed to load ledger')
      if (replace) setItems([])
    } finally {
      replace ? setLoading(false) : setLoadingMore(false)
    }
  }, [type])

  useEffect(() => { load(1, true) }, [load])

  const hasMore = items.length < total

  return (
    <div className="transaction-ledger">
      <header className="tl-header">
        <div>
          <h1 className="tl-title">Transaction Ledger</h1>
          <p className="tl-subtitle">Immutable audit trail of every wallet movement.</p>
        </div>
      </header>

      <div className="tl-stats">
        <div className="tl-stat">
          <span className="tl-stat-label">
            {type ? `${typeLabel(type)} transactions` : 'Total transactions'}
          </span>
          <span className="tl-stat-value">{loading ? '—' : total.toLocaleString()}</span>
        </div>
        <div className="tl-stat">
          <span className="tl-stat-label">Net volume</span>
          <span className="tl-stat-value">
            {loading || totalVolume === null
              ? '—'
              : <><span className="riyal-symbol">&#x20C1;</span>{formatMoney(totalVolume)}</>}
          </span>
        </div>
      </div>

      <div className="tl-toolbar">
        <div className="tl-filter">
          <Search size={16} />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {LEDGER_TYPES.map(t => (
              <option key={t} value={t}>{typeLabel(t)}</option>
            ))}
          </select>
        </div>
        {!loading && (
          <span className="tl-count">
            Showing {items.length.toLocaleString()} of {total.toLocaleString()}
          </span>
        )}
      </div>

      {error && (
        <div className="tl-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="tl-state">
          <Loader2 size={32} className="spin" />
          <span>Loading ledger…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="tl-state">
          <ScrollText size={32} />
          <h2>No transactions</h2>
          <p>{type ? `No ${typeLabel(type).toLowerCase()} transactions recorded.` : 'The ledger is empty.'}</p>
        </div>
      ) : (
        <>
          <div className="tl-table-card">
            <div className="tl-table-wrap">
              <table className="tl-table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Date</th>
                    <th>Account</th>
                    <th>Type</th>
                    <th className="tl-num">Amount</th>
                    <th className="tl-num">Fee</th>
                    <th className="tl-num">Net</th>
                    <th className="tl-num">Balance after</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(txn => {
                    const party = counterparty(txn)
                    const reference = referenceLabel(txn)
                    const credit = isCredit(txn)
                    const fee = Number(txn.fee_amount ?? 0)
                    return (
                      <tr key={txn.id}>
                        <td>
                          <span className="tl-ref">
                            <strong>{txn.transaction_no ?? '—'}</strong>
                            {reference && (
                              <em>{reference.kind} {reference.label}</em>
                            )}
                          </span>
                        </td>
                        <td className="tl-muted">{formatDate(txn.created_at, true)}</td>
                        <td>
                          <span className="tl-party">
                            <strong>{party.name}</strong>
                            {party.role && <em>{party.role}</em>}
                          </span>
                        </td>
                        <td>
                          <span className="tl-type">{typeLabel(txn.type)}</span>
                        </td>
                        <td className="tl-num">
                          <span className={`tl-amount ${credit ? 'is-credit' : 'is-debit'}`}>
                            {credit
                              ? <ArrowDownLeft size={13} aria-label="Credit" />
                              : <ArrowUpRight size={13} aria-label="Debit" />}
                            {credit ? '+' : '−'}
                            <span className="riyal-symbol">&#x20C1;</span>{formatMoney(Math.abs(txn.amount))}
                          </span>
                        </td>
                        <td className="tl-num tl-muted">
                          {fee !== 0
                            ? <><span className="riyal-symbol">&#x20C1;</span>{formatMoney(Math.abs(fee))}</>
                            : '—'}
                        </td>
                        <td className="tl-num tl-net">
                          <span className="riyal-symbol">&#x20C1;</span>{formatMoney(Math.abs(txn.net_amount))}
                        </td>
                        <td className="tl-num tl-muted">
                          <span className="riyal-symbol">&#x20C1;</span>{formatMoney(txn.available_after)}
                        </td>
                        <td>
                          <span className={`tl-badge tl-badge--${transactionStatusTone(txn.status)}`}>
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {hasMore && (
            <div className="tl-more">
              <button
                className="tl-btn"
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

export default TransactionLedger
