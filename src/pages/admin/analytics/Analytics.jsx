import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  DollarSign, Users, ShoppingCart, UserCheck,
  Loader2, RefreshCw, AlertTriangle, BarChart3, Calendar,
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

// How many orders to pull for the client-side charts. There is no time-series
// endpoint, so the trend is derived from the order list.
const CHART_ORDER_LIMIT = 500

const PRESETS = [
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
  { value: '90days', label: 'Last 90 days' },
  { value: 'mtd', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
]

/** Turns a preset (or a pair of dates) into a concrete window. */
function resolveRange(preset, from, to) {
  const dayMs = 24 * 60 * 60 * 1000
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  if (preset === 'custom' && (from || to)) {
    const start = from ? new Date(`${from}T00:00:00`) : null
    const finish = to ? new Date(`${to}T23:59:59`) : end
    return {
      from: start,
      to: finish,
      label: start
        ? `${start.toLocaleDateString()} – ${finish.toLocaleDateString()}`
        : `Up to ${finish.toLocaleDateString()}`,
    }
  }

  if (preset === 'mtd') {
    const start = new Date()
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    return { from: start, to: end, label: 'This month' }
  }

  const days = { '7days': 7, '30days': 30, '90days': 90 }[preset] ?? 7
  const start = new Date(end.getTime() - (days - 1) * dayMs)
  start.setHours(0, 0, 0, 0)
  return { from: start, to: end, label: `Last ${days} days` }
}

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

  // `draft` is what the controls hold; `applied` is what the page was last
  // fetched with. Nothing reloads until Apply is pressed, so half-typed dates
  // never fire a request.
  const [draft, setDraft] = useState({ preset: '30days', from: '', to: '' })
  const [applied, setApplied] = useState({ preset: '30days', from: '', to: '' })

  const range = useMemo(
    () => resolveRange(applied.preset, applied.from, applied.to),
    [applied.preset, applied.from, applied.to],
  )

  const fromIso = range.from ? range.from.toISOString() : undefined
  const toIso = range.to.toISOString()

  const dirty = draft.preset !== applied.preset
    || draft.from !== applied.from
    || draft.to !== applied.to

  /**
   * All state updates happen after the awaits — `loading` already starts true,
   * so the mount effect needs no synchronous setState before fetching.
   */
  const runFetch = useCallback(async () => {
    try {
      // Only the orders endpoint takes a date range. The provider summary,
      // customer count and wallet overview are platform totals with no window
      // to ask for, so those cards stay all-time and say so.
      const [sp, cust, ord, wal] = await Promise.allSettled([
        getProviderSummary(),
        getCustomers({ limit: 1 }),
        getAdminOrders({ limit: CHART_ORDER_LIMIT, from: fromIso, to: toIso }),
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
  }, [fromIso, toIso])

  useEffect(() => { runFetch() }, [runFetch])

  // Refresh is a user action, so showing the spinner up front is fine here.
  const handleRefresh = () => {
    setLoading(true)
    setFailed([])
    runFetch()
  }

  const applyRange = () => {
    setLoading(true)
    setFailed([])
    setApplied(draft)
  }

  const resetRange = () => {
    const initial = { preset: '30days', from: '', to: '' }
    setDraft(initial)
    if (dirty || applied.preset !== initial.preset) {
      setLoading(true)
      setApplied(initial)
    }
  }

  /* ---------------- Derived chart data ---------------- */

  /**
   * The trend now spans whatever window is applied rather than a fixed
   * fortnight. Past six weeks the buckets become weeks — sixty daily columns
   * on one axis is a smear, not a trend.
   */
  const revenueTrend = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000
    const end = new Date(range.to)
    end.setHours(0, 0, 0, 0)
    const start = new Date(range.from ?? new Date(end.getTime() - 29 * dayMs))
    start.setHours(0, 0, 0, 0)

    const span = Math.max(1, Math.round((end - start) / dayMs) + 1)
    const weekly = span > 45
    const stepDays = weekly ? 7 : 1

    const buckets = []
    for (let t = start.getTime(); t <= end.getTime(); t += stepDays * dayMs) {
      const day = new Date(t)
      buckets.push({
        start: t,
        end: t + stepDays * dayMs,
        label: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: 0,
        orders: 0,
      })
    }

    for (const order of orders) {
      if (String(order.status).toUpperCase() !== 'COMPLETED') continue
      if (!order.created_at) continue
      const at = new Date(order.created_at).getTime()
      if (Number.isNaN(at)) continue
      // Buckets are uniform, so the index is arithmetic rather than a scan.
      const idx = Math.floor((at - start.getTime()) / (stepDays * dayMs))
      const bucket = buckets[idx]
      if (!bucket) continue
      bucket.revenue += Number(order.total_price || 0)
      bucket.orders += 1
    }

    return buckets
  }, [orders, range.from, range.to])

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
  const completedOrders = orders.filter(o => String(o.status).toUpperCase() === 'COMPLETED')
  const completedCount = completedOrders.length
  // Computed from the orders actually in the window, so this figure moves with
  // the filter — unlike the wallet's platform-wide totals below.
  const revenueInRange = completedOrders.reduce(
    (sum, o) => sum + Number(o.total_price || 0), 0,
  )

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
          <p className="an-subtitle">
            {range.label}
            {refreshedAt && <> · updated {refreshedAt.toLocaleTimeString()}</>}
          </p>
        </div>
        <button className="an-btn" onClick={handleRefresh} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </header>

      <div className="an-filters">
        <div className="an-filter-field">
          <label htmlFor="an-preset">Period</label>
          <select
            id="an-preset"
            value={draft.preset}
            onChange={(e) => setDraft(d => ({ ...d, preset: e.target.value }))}
          >
            {PRESETS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {draft.preset === 'custom' && (
          <>
            <div className="an-filter-field">
              <label htmlFor="an-from">From</label>
              <input
                id="an-from"
                type="date"
                value={draft.from}
                max={draft.to || undefined}
                onChange={(e) => setDraft(d => ({ ...d, from: e.target.value }))}
              />
            </div>
            <div className="an-filter-field">
              <label htmlFor="an-to">To</label>
              <input
                id="an-to"
                type="date"
                value={draft.to}
                min={draft.from || undefined}
                onChange={(e) => setDraft(d => ({ ...d, to: e.target.value }))}
              />
            </div>
          </>
        )}

        <div className="an-filter-actions">
          <button
            className="an-btn an-btn--primary"
            onClick={applyRange}
            disabled={loading || !dirty}
          >
            <Calendar size={15} />
            Apply
          </button>
          <button className="an-btn" onClick={resetRange} disabled={loading}>
            Reset
          </button>
        </div>

        {/* Said plainly rather than left for someone to discover: three of the
            four cards below have no date-filtered endpoint behind them. */}
        <p className="an-filter-note">
          The range applies to orders — total orders, revenue in range and both
          charts. Customers, providers and platform revenue are all-time totals.
        </p>
      </div>

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
          label="Orders in range"
          value={count(orderMeta?.total)}
          sub={`${count(completedCount)} completed · ${range.label.toLowerCase()}`}
          icon={ShoppingCart}
          color={KPI_COLORS.orders}
          loading={loading}
        />
        <StatCard
          label="Revenue in range"
          value={<><Riyal />{money(revenueInRange)}</>}
          sub={`from ${count(completedCount)} completed orders`}
          icon={DollarSign}
          color={KPI_COLORS.revenue}
          loading={loading}
        />
        <StatCard
          label="Total customers"
          value={count(customerMeta?.total ?? customerMeta?.totalCount)}
          sub="all time"
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
      </div>

      {/* The wallet endpoint has no date window, so these sit apart from the
          filtered cards above rather than pretending to follow the range. */}
      <section className="an-card">
        <header className="an-card-head">
          <h2>Platform totals</h2>
          <span className="an-card-note">all time</span>
        </header>
        <div className="an-breakdown">
          <div className="an-breakdown-item">
            <span className="an-dot" style={{ background: KPI_COLORS.revenue }} />
            <span className="an-breakdown-label">Platform revenue</span>
            <span className="an-breakdown-value">
              {loading ? '…' : <><Riyal />{money(wallet?.total_revenue ?? wallet?.platform_commission)}</>}
            </span>
          </div>
          <div className="an-breakdown-item">
            <span className="an-dot" style={{ background: KPI_COLORS.orders }} />
            <span className="an-breakdown-label">Gross sales</span>
            <span className="an-breakdown-value">
              {loading ? '…' : <><Riyal />{money(wallet?.total_sales)}</>}
            </span>
          </div>
          <div className="an-breakdown-item">
            <span className="an-dot" style={{ background: '#f59e0b' }} />
            <span className="an-breakdown-label">Pending payouts</span>
            <span className="an-breakdown-value">
              {loading ? '…' : <><Riyal />{money(wallet?.pending_payouts)}</>}
            </span>
          </div>
          <div className="an-breakdown-item">
            <span className="an-dot" style={{ background: KPI_COLORS.providers }} />
            <span className="an-breakdown-label">Completed orders</span>
            <span className="an-breakdown-value">
              {loading ? '…' : count(wallet?.completed_orders_count)}
            </span>
          </div>
        </div>
      </section>

      <section className="an-card">
        <header className="an-card-head">
          <h2>Service provider breakdown</h2>
          <span className="an-card-note">all time</span>
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
            <p>Completed orders · {range.label.toLowerCase()}.</p>
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
