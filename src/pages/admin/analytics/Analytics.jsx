import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  DollarSign, Users, ShoppingCart, UserCheck,
  Loader2, RefreshCw, AlertTriangle, BarChart3,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { getProviderSummary } from '../../../api/providers.js'
import { getCustomers } from '../../../api/customers.js'
import { getAdminOrders } from '../../../api/orders.js'
import { getWalletOverview } from '../../../api/wallet.js'
import './Analytics.css'

const BRAND = '#F0B020'
const BRAND_DARK = '#D39A18'

// How many recent orders to pull for the client-side charts. There is no
// time-series endpoint, so the trend is derived from the order list.
const CHART_ORDER_LIMIT = 500
const TREND_DAYS = 14

const KPI_COLORS = {
  orders: '#3b82f6',
  customers: BRAND,
  providers: '#8b5cf6',
  revenue: '#10b981',
}

function toOrders(data) {
  if (Array.isArray(data)) return data
  return data?.orders ?? data?.items ?? data?.data ?? []
}

function metaOf(data, fallbackList) {
  if (Array.isArray(data)) return { total: data.length }
  return data?.meta ?? data?.pagination ?? { total: fallbackList?.length ?? 0 }
}

function money(value) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function count(value) {
  return Number(value || 0).toLocaleString('en-US')
}

function Riyal() {
  return <span className="riyal-symbol">&#x20C1;</span>
}

function StatCard(props) {
  const Icon = props.icon
  const { label, value, sub, color, loading } = props
  return (
    <article className="an-stat">
      <span className="an-stat-icon" style={{ background: `${color}1a`, color }}>
        <Icon size={20} />
      </span>
      <span className="an-stat-body">
        <span className="an-stat-label">{label}</span>
        <span className="an-stat-value">
          {loading ? <Loader2 size={18} className="spin" /> : value}
        </span>
        {sub && !loading && <span className="an-stat-sub">{sub}</span>}
      </span>
    </article>
  )
}

function Analytics() {
  const [loading, setLoading] = useState(true)
  const [refreshedAt, setRefreshedAt] = useState(null)
  const [failed, setFailed] = useState([])

  const [spSummary, setSpSummary] = useState(null)
  const [customerMeta, setCustomerMeta] = useState(null)
  const [orderMeta, setOrderMeta] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [orders, setOrders] = useState([])

  /**
   * All state updates happen after the awaits — `loading` already starts true,
   * so the mount effect needs no synchronous setState before fetching.
   */
  const runFetch = useCallback(async () => {
    try {
      const [sp, cust, ord, wal] = await Promise.allSettled([
        getProviderSummary(),
        getCustomers({ limit: 1 }),
        getAdminOrders({ limit: CHART_ORDER_LIMIT }),
        getWalletOverview(),
      ])

      // Report which sources failed rather than silently rendering zeros.
      const problems = []
      if (sp.status === 'fulfilled') setSpSummary(sp.value)
      else problems.push('service providers')

      if (cust.status === 'fulfilled') setCustomerMeta(metaOf(cust.value))
      else problems.push('customers')

      if (ord.status === 'fulfilled') {
        const list = toOrders(ord.value)
        setOrders(list)
        setOrderMeta(metaOf(ord.value, list))
      } else {
        problems.push('orders')
      }

      if (wal.status === 'fulfilled') setWallet(wal.value)
      else problems.push('wallet')

      setFailed(problems)
      setRefreshedAt(new Date())
    } catch {
      setFailed(['analytics data'])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { runFetch() }, [runFetch])

  // Refresh is a user action, so showing the spinner up front is fine here.
  const handleRefresh = () => {
    setLoading(true)
    setFailed([])
    runFetch()
  }

  /* ---------------- Derived chart data ---------------- */

  const revenueTrend = useMemo(() => {
    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
      const day = new Date(today)
      day.setDate(day.getDate() - i)
      days.push({
        key: day.toISOString().slice(0, 10),
        label: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: 0,
        orders: 0,
      })
    }

    const byKey = new Map(days.map(d => [d.key, d]))
    for (const order of orders) {
      if (String(order.status).toUpperCase() !== 'COMPLETED') continue
      if (!order.created_at) continue
      const key = new Date(order.created_at).toISOString().slice(0, 10)
      const bucket = byKey.get(key)
      if (!bucket) continue
      bucket.revenue += Number(order.total_price || 0)
      bucket.orders += 1
    }

    return days
  }, [orders])

  const serviceMix = useMemo(() => {
    const tally = new Map()
    for (const order of orders) {
      const name = order.service?.name_en ?? 'Unknown'
      tally.set(name, (tally.get(name) ?? 0) + 1)
    }
    return [...tally.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [orders])

  const trendHasData = revenueTrend.some(d => d.revenue > 0)
  const completedCount = orders.filter(o => String(o.status).toUpperCase() === 'COMPLETED').length

  const totalRevenue = wallet?.total_revenue ?? wallet?.platform_commission ?? null
  const pendingPayouts = wallet?.pending_payouts ?? null
  const grossSales = wallet?.total_sales ?? null

  const breakdown = [
    { label: 'Active', value: spSummary?.activeProviders, color: '#10b981' },
    { label: 'Pending', value: spSummary?.pendingRequests, color: '#f59e0b' },
    { label: 'Approved', value: spSummary?.approvedProviders, color: '#3b82f6' },
    { label: 'Rejected', value: spSummary?.rejectedProviders, color: '#ef4444' },
    { label: 'Suspended', value: spSummary?.suspendedProviders, color: '#8b5cf6' },
    { label: 'Inactive', value: spSummary?.inactiveProviders, color: '#9ca3af' },
  ]

  return (
    <div className="analytics-page">
      <header className="an-header">
        <div>
          <h1 className="an-title">Analytics</h1>
          <p className="an-subtitle">
            Live platform snapshot
            {refreshedAt && <> · updated {refreshedAt.toLocaleTimeString()}</>}
          </p>
        </div>
        <button className="an-btn" onClick={handleRefresh} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </header>

      {failed.length > 0 && (
        <div className="an-alert">
          <AlertTriangle size={16} />
          <span>
            Could not load {failed.join(', ')}. Those figures below may be incomplete.
          </span>
        </div>
      )}

      <div className="an-stats">
        <StatCard
          label="Total orders"
          value={count(orderMeta?.total)}
          sub={`${count(wallet?.completed_orders_count ?? completedCount)} completed`}
          icon={ShoppingCart}
          color={KPI_COLORS.orders}
          loading={loading}
        />
        <StatCard
          label="Total customers"
          value={count(customerMeta?.total ?? customerMeta?.totalCount)}
          icon={Users}
          color={KPI_COLORS.customers}
          loading={loading}
        />
        <StatCard
          label="Active providers"
          value={count(spSummary?.activeProviders)}
          sub={`${count(spSummary?.pendingRequests)} pending · ${count(spSummary?.totalProviders)} total`}
          icon={UserCheck}
          color={KPI_COLORS.providers}
          loading={loading}
        />
        <StatCard
          label="Platform revenue"
          value={totalRevenue != null ? <><Riyal />{money(totalRevenue)}</> : '—'}
          sub={
            pendingPayouts != null
              ? <>Pending payouts: <Riyal />{money(pendingPayouts)}</>
              : grossSales != null
                ? <>Gross sales: <Riyal />{money(grossSales)}</>
                : undefined
          }
          icon={DollarSign}
          color={KPI_COLORS.revenue}
          loading={loading}
        />
      </div>

      <section className="an-card">
        <header className="an-card-head">
          <h2>Service provider breakdown</h2>
        </header>
        <div className="an-breakdown">
          {breakdown.map(({ label, value, color }) => (
            <div key={label} className="an-breakdown-item">
              <span className="an-dot" style={{ background: color }} />
              <span className="an-breakdown-label">{label}</span>
              <span className="an-breakdown-value" style={{ color }}>
                {loading ? '…' : count(value)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="an-charts">
        <section className="an-card">
          <header className="an-card-head">
            <h2>Revenue trend</h2>
            <p>Completed orders over the last {TREND_DAYS} days.</p>
          </header>
          {loading ? (
            <div className="an-chart-state"><Loader2 size={26} className="spin" /></div>
          ) : !trendHasData ? (
            <div className="an-chart-state">
              <BarChart3 size={30} />
              <p>No completed orders in this period.</p>
            </div>
          ) : (
            <div className="an-chart">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-base)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--border-light)' }}
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-base)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value, name) => (
                      name === 'revenue'
                        ? [`⃁${money(value)}`, 'Revenue']
                        : [value, 'Orders']
                    )}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {revenueTrend.map((entry, i) => (
                      <Cell
                        key={entry.key}
                        fill={i === revenueTrend.length - 1 ? BRAND_DARK : BRAND}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="an-card">
          <header className="an-card-head">
            <h2>Service distribution</h2>
            <p>Orders per service, most recent {CHART_ORDER_LIMIT}.</p>
          </header>
          {loading ? (
            <div className="an-chart-state"><Loader2 size={26} className="spin" /></div>
          ) : serviceMix.length === 0 ? (
            <div className="an-chart-state">
              <BarChart3 size={30} />
              <p>No orders to break down yet.</p>
            </div>
          ) : (
            <ul className="an-mix">
              {serviceMix.map((entry) => {
                const top = serviceMix[0].value || 1
                return (
                  <li key={entry.name} className="an-mix-row">
                    <span className="an-mix-name" title={entry.name}>{entry.name}</span>
                    <span className="an-mix-bar">
                      <span
                        className="an-mix-fill"
                        style={{ width: `${Math.max((entry.value / top) * 100, 3)}%` }}
                      />
                    </span>
                    <span className="an-mix-value">{count(entry.value)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default Analytics
