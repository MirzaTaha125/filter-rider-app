import { useState, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, AlertTriangle,
  DollarSign, ArrowUpRight, ArrowDownRight, Percent, Loader2
} from 'lucide-react'
import { getWalletOverview, getPaymentApprovals, getWalletLedger, approvePayment, rejectPayment } from '../../../api'
import './WalletManagement.css'

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function WalletManagement() {
  const [overview, setOverview] = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [approvalsLoading, setApprovalsLoading] = useState(true)
  const [ledger, setLedger] = useState([])
  const [ledgerLoading, setLedgerLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    getWalletOverview()
      .then((data) => setOverview(Array.isArray(data) ? data[0] : data))
      .catch(() => {})
      .finally(() => setOverviewLoading(false))

    getPaymentApprovals({ status: 'PENDING', limit: 5 })
      .then((data) => {
        const arr = Array.isArray(data) ? data : (data?.items ?? data?.data ?? [])
        setPendingApprovals(arr)
      })
      .catch(() => {})
      .finally(() => setApprovalsLoading(false))

    getWalletLedger({ limit: 5 })
      .then((data) => {
        const arr = Array.isArray(data) ? data : (data?.items ?? data?.data ?? [])
        setLedger(arr)
      })
      .catch(() => {})
      .finally(() => setLedgerLoading(false))
  }, [])

  const handleApprove = async (id) => {
    setActionLoading(id)
    try {
      await approvePayment(id)
      setPendingApprovals((prev) => prev.filter((a) => a.id !== id))
      setOverview((prev) => prev ? { ...prev, pending_approvals_count: (prev.pending_approvals_count || 1) - 1 } : prev)
    } catch (e) {
      alert(e.message || 'Failed to approve')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDecline = async (id) => {
    if (!confirm('Reject this payment request?')) return
    setActionLoading(id)
    try {
      await rejectPayment(id)
      setPendingApprovals((prev) => prev.filter((a) => a.id !== id))
    } catch (e) {
      alert(e.message || 'Failed to reject')
    } finally {
      setActionLoading(null)
    }
  }

  const kpis = [
    {
      label: 'TOTAL SP EARNINGS',
      value: overview?.total_sp_earnings ?? overview?.total_earnings,
      icon: DollarSign,
      trendType: 'positive',
    },
    {
      label: 'PLATFORM COMMISSION',
      value: overview?.platform_commission ?? overview?.total_commission,
      icon: Percent,
      hasOverlay: true,
      trendType: 'positive',
    },
    {
      label: 'TOTAL PAYOUTS',
      value: overview?.total_payouts ?? overview?.total_withdrawn,
      icon: ArrowDownRight,
      trendType: 'negative',
    },
    {
      label: 'NET BALANCE',
      value: overview?.net_balance ?? overview?.platform_balance,
      icon: ArrowUpRight,
      trendType: 'positive',
    },
  ]

  const negativeCount = overview?.negative_balance_providers_count ?? overview?.negative_balance_count ?? 0

  return (
    <div className="wallet-management">
      {/* KPI Cards */}
      <div className="wallet-kpi-grid">
        {kpis.map((kpi, index) => {
          const IconComponent = kpi.icon
          return (
            <div key={index} className="wallet-kpi-card">
              <div className="wallet-kpi-content">
                <div className="wallet-kpi-label">{kpi.label}</div>
                <div className="wallet-kpi-value">
                  {overviewLoading
                    ? <Loader2 size={20} className="spin" />
                    : <><span className="riyal-symbol">&#x20C1;</span>{fmt(kpi.value)}</>}
                </div>
                <div className={`wallet-kpi-trend ${kpi.trendType}`}>
                  {kpi.trendType === 'positive' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </div>
              </div>
              <div className="wallet-kpi-icon-wrapper">
                <IconComponent size={24} />
              </div>
              {kpi.hasOverlay && (
                <div className="wallet-kpi-overlay">
                  <Percent size={80} style={{ opacity: 0.1 }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Negative Balance Alert */}
      {negativeCount > 0 && (
        <div className="negative-balance-alert">
          <div className="alert-content">
            <div className="alert-icon-wrapper"><AlertTriangle size={20} /></div>
            <div className="alert-text">
              <div className="alert-title">Negative Balance Alert</div>
              <div className="alert-description">
                {negativeCount} Service Provider{negativeCount !== 1 ? 's' : ''} currently have a negative balance.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Approvals + Ledger Preview */}
      <div className="wallet-middle-section">
        {/* Pending Approvals Card */}
        <div className="approvals-card">
          <div className="card-header">
            <h3 className="card-title">Pending Approvals</h3>
            {overview?.pending_approvals_count > 0 && (
              <span className="badge-count">{overview.pending_approvals_count}</span>
            )}
          </div>
          {approvalsLoading ? (
            <div className="wallet-loading"><Loader2 size={20} className="spin" /> Loading…</div>
          ) : pendingApprovals.length === 0 ? (
            <div className="wallet-empty"><DollarSign size={32} style={{ opacity: 0.3 }} /><p>No pending approvals</p></div>
          ) : (
            <div className="approvals-list">
              {pendingApprovals.map((a) => {
                const providerName = a.provider?.name ?? a.provider?.full_name ?? a.provider?.email ?? `#${a.id?.slice(0, 8)}`
                const method = a.bank_account?.bank_name ?? a.payment_method ?? 'Bank Transfer'
                const timeAgo = a.created_at ? new Date(a.created_at).toLocaleDateString() : ''
                return (
                  <div key={a.id} className="approval-item">
                    <div className="approval-info">
                      <div className="approval-entity">{providerName}</div>
                      <div className="approval-amount"><span className="riyal-symbol">&#x20C1;</span>{fmt(a.amount)}</div>
                      <div className="approval-details">{method} • {timeAgo}</div>
                    </div>
                    <div className="approval-actions">
                      <button
                        className="btn-decline"
                        onClick={() => handleDecline(a.id)}
                        disabled={actionLoading === a.id}
                      >
                        {actionLoading === a.id ? <Loader2 size={14} className="spin" /> : '✕'}
                      </button>
                      <button
                        className="btn-approve"
                        onClick={() => handleApprove(a.id)}
                        disabled={actionLoading === a.id}
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="approvals-footer">
            <a href="/admin/wallet/payment-approval" className="link-view-all">View All Requests</a>
          </div>
        </div>

        {/* Recent Ledger */}
        <div className="reconciliation-card">
          <div className="card-header">
            <h3 className="card-title">Recent Transactions</h3>
          </div>
          {ledgerLoading ? (
            <div className="wallet-loading"><Loader2 size={20} className="spin" /> Loading…</div>
          ) : ledger.length === 0 ? (
            <div className="wallet-empty"><p>No transactions yet</p></div>
          ) : (
            <div className="reconciliation-content">
              {ledger.slice(0, 5).map((txn) => {
                const entity = txn.provider?.name ?? txn.user?.name ?? txn.reference_code ?? txn.id?.slice(0, 8)
                const amount = txn.amount ?? txn.gross_amount ?? 0
                return (
                  <div key={txn.id} className="reconciliation-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <div className="reconciliation-label">{entity}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{txn.type}</div>
                    </div>
                    <div className="reconciliation-amount" style={{ fontSize: '14px' }}>
                      <span className="riyal-symbol">&#x20C1;</span>{fmt(amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="approvals-footer">
            <a href="/admin/wallet/transaction-ledger" className="link-view-all">View Full Ledger</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WalletManagement
