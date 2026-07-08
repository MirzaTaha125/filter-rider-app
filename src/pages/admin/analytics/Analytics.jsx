import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Users, ShoppingCart, BarChart3, PieChart, UserCheck, Loader2, RefreshCw } from 'lucide-react'
import { getProviderSummary } from '../../../api/providers.js'
import { getCustomers } from '../../../api/customers.js'
import { getAdminOrders } from '../../../api/orders.js'
import { getWalletOverview } from '../../../api/wallet.js'
import './Analytics.css'

function StatCard({ label, value, sub, icon: Icon, color, loading }) {
  return (
    <div className="analytics-metric-card">
      <div className="metric-icon" style={{ backgroundColor: `${color}15`, color }}>
        <Icon size={24} />
      </div>
      <div className="metric-content">
        <div className="metric-label">{label}</div>
        <div className="metric-value">
          {loading ? <Loader2 size={20} className="analytics-spin" /> : value}
        </div>
        {sub && !loading && <div className="metric-sub">{sub}</div>}
      </div>
    </div>
  )
}

function Analytics() {
  const [loading, setLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState(null)

  const [spSummary, setSpSummary]     = useState(null)
  const [customerMeta, setCustomerMeta] = useState(null)
  const [orderMeta, setOrderMeta]     = useState(null)
  const [wallet, setWallet]           = useState(null)

  const fetchAll = async () => {
    setLoading(true)
    const [sp, cust, ord, wal] = await Promise.allSettled([
      getProviderSummary(),
      getCustomers({ limit: 1 }),
      getAdminOrders({ limit: 1 }),
      getWalletOverview(),
    ])
    if (sp.status    === 'fulfilled') setSpSummary(sp.value)
    if (cust.status  === 'fulfilled') {
      const d = cust.value
      setCustomerMeta(Array.isArray(d) ? { total: d.length } : (d?.meta ?? d))
    }
    if (ord.status   === 'fulfilled') {
      const d = ord.value
      setOrderMeta(Array.isArray(d) ? { total: d.length } : (d?.meta ?? d))
    }
    if (wal.status   === 'fulfilled') setWallet(wal.value)
    setLastRefreshed(new Date())
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

  // Wallet overview field names are unknown until the API responds — try common shapes
  const totalRevenue = wallet?.totalRevenue ?? wallet?.total_revenue
    ?? wallet?.platformEarnings ?? wallet?.platform_earnings
    ?? wallet?.balance ?? wallet?.available_balance ?? null

  const pendingPayouts = wallet?.pendingPayouts ?? wallet?.pending_payouts
    ?? wallet?.pendingWithdrawals ?? wallet?.locked_balance ?? null

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div className="analytics-header-content">
          <div>
            <h1 className="analytics-title">Analytics & Reports</h1>
            <p className="analytics-subtitle">
              Live platform snapshot
              {lastRefreshed && (
                <span className="analytics-refreshed"> · Updated {lastRefreshed.toLocaleTimeString()}</span>
              )}
            </p>
          </div>
          <button className="analytics-refresh-btn" onClick={fetchAll} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'analytics-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="analytics-metrics-grid">
        <StatCard
          label="Total Orders"
          value={fmt(orderMeta?.total)}
          sub={`Completed: ${fmt(orderMeta?.completedCount ?? orderMeta?.completed)}`}
          icon={ShoppingCart}
          color="#3b82f6"
          loading={loading}
        />
        <StatCard
          label="Total Customers"
          value={fmt(customerMeta?.total ?? customerMeta?.totalCount)}
          icon={Users}
          color="#FCC246"
          loading={loading}
        />
        <StatCard
          label="Active SPs"
          value={fmt(spSummary?.activeProviders)}
          sub={`Pending: ${fmt(spSummary?.pendingRequests)} · Total: ${fmt(spSummary?.totalProviders)}`}
          icon={UserCheck}
          color="#8b5cf6"
          loading={loading}
        />
        <StatCard
          label="Platform Revenue"
          value={totalRevenue != null ? <><span className="riyal-symbol">&#x20C1;</span>{fmt(totalRevenue)}</> : '—'}
          sub={pendingPayouts != null ? `Pending payouts: ﷼${fmt(pendingPayouts)}` : undefined}
          icon={DollarSign}
          color="#10b981"
          loading={loading}
        />
      </div>

      {/* SP Breakdown */}
      <div className="analytics-section">
        <h3 className="analytics-section-title">Service Provider Breakdown</h3>
        <div className="analytics-breakdown-grid">
          {[
            { label: 'Active',    value: spSummary?.activeProviders,    color: '#10b981' },
            { label: 'Pending',   value: spSummary?.pendingRequests,    color: '#f59e0b' },
            { label: 'Approved',  value: spSummary?.approvedProviders,  color: '#3b82f6' },
            { label: 'Rejected',  value: spSummary?.rejectedProviders,  color: '#ef4444' },
            { label: 'Suspended', value: spSummary?.suspendedProviders, color: '#8b5cf6' },
            { label: 'Inactive',  value: spSummary?.inactiveProviders,  color: '#9ca3af' },
          ].map(({ label, value, color }) => (
            <div key={label} className="breakdown-item">
              <div className="breakdown-dot" style={{ background: color }} />
              <div className="breakdown-label">{label}</div>
              <div className="breakdown-value" style={{ color }}>
                {loading ? '…' : fmt(value ?? 0)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts placeholder */}
      <div className="analytics-charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Revenue Trend</h3>
            <BarChart3 size={20} />
          </div>
          <div className="chart-placeholder">
            <TrendingUp size={40} style={{ opacity: 0.2 }} />
            <p>Time-series analytics API coming soon</p>
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <h3>Service Distribution</h3>
            <PieChart size={20} />
          </div>
          <div className="chart-placeholder">
            <PieChart size={40} style={{ opacity: 0.2 }} />
            <p>Time-series analytics API coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
