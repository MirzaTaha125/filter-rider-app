import { useState, useEffect } from 'react'
import { Filter, Loader2 } from 'lucide-react'
import { getWalletLedger } from '../../../api'
import './TransactionLedger.css'

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const LEDGER_TYPES = [
  '', 'TOPUP', 'EARNING', 'WITHDRAWAL_REQUEST',
  'WITHDRAWAL_APPROVED', 'WITHDRAWAL_REJECTED',
  'REFUND', 'ADJUSTMENT', 'REVERSAL',
]

function TransactionLedger() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadLedger(1)
  }, [typeFilter])

  const loadLedger = async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const data = await getWalletLedger({ type: typeFilter || undefined, page: p, limit: 20 })
      const arr = Array.isArray(data) ? data : (data?.items ?? data?.data ?? [])
      const total = data?.total ?? data?.meta?.total ?? arr.length
      setTransactions(p === 1 ? arr : (prev) => [...prev, ...arr])
      setPage(p)
      setHasMore(arr.length === 20 && arr.length < total)
    } catch (e) {
      setError(e.message || 'Failed to load ledger')
    } finally {
      setLoading(false)
    }
  }

  const totalVolume = transactions.reduce((s, t) => s + Math.abs(Number(t.amount ?? t.gross_amount ?? 0)), 0)

  return (
    <div className="transaction-ledger">
      <div className="ledger-header">
        <div>
          <h1 className="ledger-title">Immutable Transaction Ledger</h1>
          <p className="ledger-subtitle">Complete audit trail of all financial transactions</p>
        </div>
        <div className="ledger-controls">
          <button className="btn-filter" onClick={() => setShowFilters((s) => !s)}>
            <Filter size={18} />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
            >
              {LEDGER_TYPES.map((t) => (
                <option key={t} value={t}>{t || 'All Types'}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="ledger-stats">
        <div className="stat-card">
          <div className="stat-label">Total Transactions</div>
          <div className="stat-value">{loading ? '—' : transactions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Volume</div>
          <div className="stat-value">
            {loading ? '—' : <><span className="riyal-symbol">&#x20C1;</span>{fmt(totalVolume)}</>}
          </div>
        </div>
      </div>

      {error && <div className="ledger-error">{error}</div>}

      <div className="ledger-table-container">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>REFERENCE</th>
              <th>DATE & TIME</th>
              <th>ENTITY</th>
              <th>TYPE</th>
              <th>AMOUNT</th>
              <th>COMMISSION</th>
              <th>NET</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {loading && transactions.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                <Loader2 size={24} className="spin" style={{ margin: '0 auto' }} />
              </td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                No transactions found
              </td></tr>
            ) : transactions.map((txn) => {
              const ref = txn.reference_code ?? txn.id?.slice(0, 12)
              const date = txn.created_at ? new Date(txn.created_at).toLocaleString() : '—'
              const entity = txn.provider?.name ?? txn.provider?.full_name ?? txn.user?.name ?? txn.user?.full_name ?? '—'
              const amount = Number(txn.amount ?? txn.gross_amount ?? 0)
              const commission = Number(txn.commission_amount ?? txn.platform_fee ?? 0)
              const net = Number(txn.net_amount ?? txn.net ?? (amount - commission))
              const status = txn.status ?? ''
              return (
                <tr key={txn.id} className="ledger-row">
                  <td className="transaction-id">{ref}</td>
                  <td className="transaction-date">{date}</td>
                  <td className="transaction-entity">{entity}</td>
                  <td className="transaction-type">
                    <span className="type-badge">{txn.type}</span>
                  </td>
                  <td className="transaction-gross">
                    <span className="riyal-symbol">&#x20C1;</span>{fmt(Math.abs(amount))}
                  </td>
                  <td className={`transaction-commission ${commission > 0 ? 'negative' : ''}`}>
                    {commission !== 0 ? <><span className="riyal-symbol">&#x20C1;</span>{fmt(Math.abs(commission))}</> : '—'}
                  </td>
                  <td className={`transaction-net ${net < 0 ? 'negative' : ''}`}>
                    <span className="riyal-symbol">&#x20C1;</span>{fmt(Math.abs(net))}
                  </td>
                  <td className="transaction-status">
                    <span className={`status-indicator ${status.toLowerCase()}`}>
                      <span className="status-dot"></span>
                      {status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', padding: '16px' }}>
          <button className="btn-filter" onClick={() => loadLedger(page + 1)} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}

export default TransactionLedger
