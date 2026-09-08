import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import TableScroll from '../../../components/DataTable/TableScroll'
import StatTile from '../../../components/StatTile/StatTile'
import { getAdminOrders } from '../../../api/orders.js'
import { getZone } from '../../../api/zones.js'
import Pager from '../../../components/DataTable/Pager'
import { normalizeStatus, orderStatusTone } from '../orders/orderStatus'
import { formatMoney } from '../orders/paymentStatus'
import '../adminForm.css'

function toList(data) {
  if (Array.isArray(data)) return data
  return data?.orders ?? data?.items ?? data?.data ?? []
}

function customerNameOf(order) {
  return (
    order.customer?.user?.full_name
    || order.customer?.profile?.full_name
    || order.customer?.profile?.company_name
    || order.customer?.full_name
    || order.customer_name
    || '—'
  )
}

function providerNameOf(order) {
  return (
    order.provider?.user?.full_name
    || order.provider?.profile?.full_name
    || order.provider?.full_name
    || order.provider_name
    || null
  )
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

function AnalyticsZoneOrders() {
  const { zoneId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const queryName = searchParams.get('name') || ''

  const [name, setName] = useState(queryName)
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (queryName || !zoneId || zoneId === 'unzoned') return
    getZone(zoneId)
      .then((raw) => setName(
        raw.zone_name
          ? raw.city
            ? `${raw.zone_name} · ${raw.city}`
            : raw.zone_name
          : raw.name ?? 'Zone',
      ))
      .catch(() => {})
  }, [zoneId, queryName])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getAdminOrders({
      zoneId,
      from: from || undefined,
      to: to || undefined,
      page,
      limit,
    })
      .then((raw) => {
        if (cancelled) return
        const list = toList(raw)
        setOrders(list)
        setTotal(raw?.meta?.total ?? raw?.total ?? list.length)
      })
      .catch((err) => {
        if (!cancelled) {
          setOrders([])
          setTotal(0)
          setError(err.message || 'Failed to load orders')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [zoneId, from, to, page, limit])

  const completed = orders.filter((o) => normalizeStatus(o.status) === 'COMPLETED').length
  const sales = orders
    .filter((o) => normalizeStatus(o.status) === 'COMPLETED')
    .reduce((sum, o) => sum + Number(o.total_price || 0), 0)

  const rangeLabel = from && to
    ? `${new Date(from).toLocaleString()} – ${new Date(to).toLocaleString()}`
    : 'All time'

  return (
    <div className="dt-page-layout">
      <PageHeader
        title={name || (zoneId === 'unzoned' ? 'Unzoned' : 'Zone orders')}
        subtitle={`Orders for this zone · ${rangeLabel}`}
        onBack={() => navigate('/admin/analytics')}
      />

      {error && (
        <div className="sf-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="stat-tile-row">
        <StatTile
          label="Orders"
          value={loading ? null : total}
          hint={rangeLabel}
        />
        <StatTile
          label="On this page"
          value={loading ? null : orders.length}
          hint={`${completed} completed`}
        />
        <StatTile
          label="Sales on this page"
          value={loading ? null : sales}
          money
          hint="Completed orders"
        />
      </div>

      <div className="dt-card">
        {loading ? (
          <div className="dt-state">
            <Loader2 size={22} className="spin" />
            <span>Loading orders…</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="dt-state">No orders for this zone in this range.</div>
        ) : (
          <TableScroll>
            <table className="dt-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date & time</th>
                  <th>Customer</th>
                  <th>Provider</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Sales</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const status = normalizeStatus(order.status)
                  const money = formatMoney(order.total_price, order.currency)
                  const provider = providerNameOf(order)
                  return (
                    <tr
                      key={order.id}
                      className="is-clickable"
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                    >
                      <td>
                        <strong>{order.order_no ?? `#${String(order.id).slice(0, 8)}`}</strong>
                      </td>
                      <td className="dt-muted">{formatDateTime(order.created_at)}</td>
                      <td>{customerNameOf(order)}</td>
                      <td>
                        {provider
                          ? provider
                          : <span className="dt-muted">Unassigned</span>}
                      </td>
                      <td>{order.service?.name_en ?? order.service?.name ?? '—'}</td>
                      <td>
                        <span className={`dt-status dt-status--${orderStatusTone(status)}`}>
                          {status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <strong>
                          <span className="riyal-symbol">&#x20C1;</span>{money.amount}
                        </strong>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableScroll>
        )}

        <Pager
          page={page}
          total={total}
          limit={limit}
          onChange={setPage}
          onLimitChange={setLimit}
          unit="orders"
          centered
          disabled={loading}
        />
      </div>
    </div>
  )
}

export default AnalyticsZoneOrders
