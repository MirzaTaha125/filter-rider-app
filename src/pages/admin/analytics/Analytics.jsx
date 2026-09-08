import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, Calendar } from 'lucide-react'
import { getAdminAnalytics } from '../../../api/orders.js'
import { normalizeStatus, orderStatusTone } from '../orders/orderStatus'
import StatTile from '../../../components/StatTile/StatTile'
import TableScroll from '../../../components/DataTable/TableScroll'
import Pager from '../../../components/DataTable/Pager'
import '../adminForm.css'
import './Analytics.css'

const TABS = [
  { id: 'orders', label: 'Total Order' },
  { id: 'provider', label: 'By Service Provider' },
  { id: 'customer', label: 'Sales By Customer' },
  { id: 'zone', label: 'Sales by Zone' },
  { id: 'service', label: 'Sales by Services' },
  { id: 'commission', label: 'Our Commission' },
]

const PRESETS = [
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
  { value: '90days', label: 'Last 90 days' },
  { value: 'mtd', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
]

const GROUP_META = {
  provider: { key: 'by_provider', idField: 'provider_id', empty: 'No provider sales in this range.' },
  customer: { key: 'by_customer', idField: 'customer_id', empty: 'No customer sales in this range.' },
  zone: { key: 'by_zone', idField: 'zone_id', empty: 'No zone sales in this range.' },
  service: { key: 'by_service', idField: 'service_id', empty: 'No service sales in this range.' },
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function toLocalInput(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function rangeFromPreset(preset, from, to) {
  const end = new Date()
  end.setSeconds(59, 999)

  if (preset === 'custom') {
    return {
      from: from ? new Date(from) : null,
      to: to ? new Date(to) : end,
    }
  }

  if (preset === 'mtd') {
    const start = new Date()
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    return { from: start, to: end }
  }

  const days = { '7days': 7, '30days': 30, '90days': 90 }[preset] ?? 30
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)
  return { from: start, to: end }
}

function defaultDraft(preset = '30days') {
  const { from, to } = rangeFromPreset(preset)
  return {
    preset,
    from: toLocalInput(from),
    to: toLocalInput(to),
  }
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

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

function emptyReport() {
  return {
    totals: {
      order_count: 0,
      completed_count: 0,
      cancelled_count: 0,
      sales: 0,
      commission: 0,
      provider_net: 0,
    },
    by_provider: [],
    by_customer: [],
    by_zone: [],
    by_service: [],
    orders: [],
    meta: { truncated: false, total: 0, returned: 0 },
  }
}

function Analytics() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('orders')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [draft, setDraft] = useState(() => defaultDraft())
  const [applied, setApplied] = useState(() => defaultDraft())
  const [report, setReport] = useState(emptyReport)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const dirty = draft.preset !== applied.preset
    || draft.from !== applied.from
    || draft.to !== applied.to

  const rangeLabel = useMemo(() => {
    const from = applied.from ? new Date(applied.from) : null
    const to = applied.to ? new Date(applied.to) : null
    if (from && to) return `${from.toLocaleString()} – ${to.toLocaleString()}`
    if (from) return `From ${from.toLocaleString()}`
    if (to) return `Up to ${to.toLocaleString()}`
    return 'All time'
  }, [applied.from, applied.to])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getAdminAnalytics({
      from: applied.from ? new Date(applied.from).toISOString() : undefined,
      to: applied.to ? new Date(applied.to).toISOString() : undefined,
    })
      .then((data) => {
        if (!cancelled) setReport({ ...emptyReport(), ...data })
      })
      .catch((err) => {
        if (!cancelled) {
          setReport(emptyReport())
          setError(err.message || 'Failed to load analytics')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [applied.from, applied.to])

  const applyRange = () => {
    setPage(1)
    setApplied({ ...draft })
  }

  const resetRange = () => {
    const next = defaultDraft()
    setDraft(next)
    setPage(1)
    setApplied(next)
  }

  const handlePreset = (preset) => {
    if (preset === 'custom') {
      setDraft((d) => ({ ...d, preset }))
      return
    }
    setDraft(defaultDraft(preset))
  }

  const switchTab = (id) => {
    setTab(id)
    setPage(1)
  }

  const groupMeta = GROUP_META[tab]
  const groups = groupMeta ? (report[groupMeta.key] ?? []) : []
  const filteredOrders = useMemo(() => {
    const list = report.orders ?? []
    if (tab === 'commission') {
      return list.filter((o) => normalizeStatus(o.status) === 'COMPLETED')
    }
    return list
  }, [report.orders, tab])

  const totals = report.totals
  const activeTab = TABS.find((t) => t.id === tab)
  const pageTotal = groupMeta ? groups.length : filteredOrders.length
  const totalPages = Math.max(1, Math.ceil(pageTotal / limit) || 1)
  const safePage = Math.min(page, totalPages)
  const pagedGroups = groups.slice((safePage - 1) * limit, safePage * limit)
  const pagedOrders = filteredOrders.slice((safePage - 1) * limit, safePage * limit)

  return (
    <div className="dt-page-layout analytics-page">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">
            Sales, commission and orders for {rangeLabel}.
          </p>
        </div>
      </header>

      {error && (
        <div className="sf-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {report.meta?.truncated && (
        <div className="sf-alert">
          <AlertTriangle size={16} />
          <span>
            Showing the latest {count(report.meta.returned)} of {count(report.meta.total)} orders.
            Narrow the range to include everything.
          </span>
        </div>
      )}

      <div className="stat-tile-row">
        <StatTile
          label="Total orders"
          value={loading ? null : totals.order_count}
          hint={`${count(totals.completed_count)} completed · ${count(totals.cancelled_count)} cancelled`}
          onClick={() => switchTab('orders')}
          title="Show all orders"
        />
        <StatTile
          label="Sales"
          value={loading ? null : totals.sales}
          money
          hint="Completed orders"
          onClick={() => switchTab('customer')}
          title="Sales by customer"
        />
        <StatTile
          label="Our commission"
          value={loading ? null : totals.commission}
          money
          hint="Platform share"
          onClick={() => switchTab('commission')}
          title="Show commission"
        />
        <StatTile
          label="Provider net"
          value={loading ? null : totals.provider_net}
          money
          hint="After commission"
          onClick={() => switchTab('provider')}
          title="Sales by provider"
        />
      </div>

      <div className="dt-card">
        <div className="dt-filters an-filters">
          <div className="dt-field">
            <label htmlFor="an-preset">Period</label>
            <select
              id="an-preset"
              value={draft.preset}
              onChange={(e) => handlePreset(e.target.value)}
            >
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="dt-field">
            <label htmlFor="an-from">From</label>
            <input
              id="an-from"
              type="datetime-local"
              value={draft.from}
              max={draft.to || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, preset: 'custom', from: e.target.value }))}
            />
          </div>
          <div className="dt-field">
            <label htmlFor="an-to">To</label>
            <input
              id="an-to"
              type="datetime-local"
              value={draft.to}
              min={draft.from || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, preset: 'custom', to: e.target.value }))}
            />
          </div>
          <button
            className="dt-btn dt-btn--primary"
            onClick={applyRange}
            disabled={loading || !dirty}
          >
            <Calendar size={15} />
            Apply
          </button>
          <button className="dt-btn" onClick={resetRange} disabled={loading}>
            Reset
          </button>
        </div>

        <div className="an-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`an-tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => switchTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="dt-state">
            <Loader2 size={22} className="spin" />
            <span>Loading analytics…</span>
          </div>
        ) : (
          <>
            <div className="an-section-head">
              <div>
                <h2>{activeTab?.label}</h2>
                <p>
                  {tab === 'orders' && 'Every order created in this range.'}
                  {tab === 'commission' && `Completed orders only · ${money(totals.commission)} commission.`}
                  {tab === 'provider' && `${count(groups.length)} providers. Click a row to open their orders.`}
                  {tab === 'customer' && `${count(groups.length)} customers. Click a row to open their orders.`}
                  {tab === 'zone' && `${count(groups.length)} zones. Click a row to open their orders.`}
                  {tab === 'service' && `${count(groups.length)} services. Click a row to open their orders.`}
                </p>
              </div>
            </div>

            {groupMeta && (
              groups.length === 0 ? (
                <div className="dt-state">{groupMeta.empty}</div>
              ) : (
                <TableScroll>
                  <table className="dt-table" style={{ minWidth: 720 }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Orders</th>
                        <th>Completed</th>
                        <th>Sales</th>
                        <th>Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedGroups.map((row) => (
                        <tr
                          key={row.id}
                          className="is-clickable"
                          onClick={() => {
                            const drill = {
                              provider: { path: 'providers', skip: ['unassigned', 'unknown'] },
                              customer: { path: 'customers', skip: ['unknown'] },
                              zone: { path: 'zones', skip: [] },
                              service: { path: 'services', skip: ['unknown'] },
                            }[tab]
                            if (!drill || !row.id || drill.skip.includes(row.id)) return
                            const qs = new URLSearchParams()
                            qs.set('name', row.name)
                            if (applied.from) qs.set('from', new Date(applied.from).toISOString())
                            if (applied.to) qs.set('to', new Date(applied.to).toISOString())
                            navigate(`/admin/analytics/${drill.path}/${row.id}?${qs}`)
                          }}
                        >
                          <td><strong>{row.name}</strong></td>
                          <td>{count(row.order_count)}</td>
                          <td>{count(row.completed_count)}</td>
                          <td>
                            <strong>
                              <span className="riyal-symbol">&#x20C1;</span>{money(row.sales)}
                            </strong>
                          </td>
                          <td>
                            <span className="riyal-symbol">&#x20C1;</span>{money(row.commission)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              )
            )}

            {tab !== 'provider' && tab !== 'customer' && tab !== 'zone' && tab !== 'service' && (
              <>
                <OrderTable
                  orders={pagedOrders}
                  showCommission={tab === 'commission' || Boolean(groupMeta)}
                  onOpen={(id) => navigate(`/admin/orders/${id}`)}
                  empty={
                    tab === 'commission'
                      ? 'No completed orders — no commission in this range.'
                      : 'No orders in this range.'
                  }
                />
              </>
            )}

            <Pager
              page={safePage}
              total={pageTotal}
              limit={limit}
              onChange={setPage}
              onLimitChange={setLimit}
              unit={groupMeta ? 'rows' : 'orders'}
              centered
            />
          </>
        )}
      </div>
    </div>
  )
}

function OrderTable({ orders, showCommission, onOpen, empty }) {
  if (orders.length === 0) {
    return <div className="dt-state">{empty}</div>
  }

  return (
    <TableScroll>
      <table className="dt-table" style={{ minWidth: showCommission ? 980 : 860 }}>
        <thead>
          <tr>
            <th>Order</th>
            <th>Date & time</th>
            <th>Customer</th>
            <th>Provider</th>
            <th>Service</th>
            <th>Zone</th>
            <th>Status</th>
            <th>Sales</th>
            {showCommission && <th>Commission</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const status = normalizeStatus(order.status)
            return (
              <tr
                key={order.id}
                className="is-clickable"
                onClick={() => onOpen(order.id)}
              >
                <td><strong>{order.order_no ?? `#${String(order.id).slice(0, 8)}`}</strong></td>
                <td className="dt-muted">{formatDateTime(order.created_at)}</td>
                <td>{order.customer_name ?? '—'}</td>
                <td>
                  {order.provider_id
                    ? order.provider_name
                    : <span className="dt-muted">Unassigned</span>}
                </td>
                <td>{order.service_name ?? '—'}</td>
                <td className="dt-muted">{order.zone_name ?? '—'}</td>
                <td>
                  <span className={`dt-status dt-status--${orderStatusTone(status)}`}>
                    {status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td>
                  <strong>
                    <span className="riyal-symbol">&#x20C1;</span>{money(order.total_price)}
                  </strong>
                </td>
                {showCommission && (
                  <td>
                    <span className="riyal-symbol">&#x20C1;</span>{money(order.commission)}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </TableScroll>
  )
}

export default Analytics
