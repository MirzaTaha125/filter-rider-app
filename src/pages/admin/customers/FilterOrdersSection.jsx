import { Fragment, useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, RefreshCw, Store } from 'lucide-react'
import { getCustomerFilterOrders, refreshCustomerFilterOrders } from '../../../api'
import TableScroll from '../../../components/DataTable/TableScroll'
import './FilterOrdersSection.css'

const PAGE_SIZE = 20

function money(value) {
  return Number(value ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(value, withTime = false) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return withTime ? d.toLocaleString() : d.toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function statusTone(status) {
  switch (String(status ?? '').toUpperCase()) {
    case 'CANCELLED': return 'danger'
    case 'DRAFT': return 'neutral'
    default: return 'success'
  }
}

function paymentTone(payment) {
  switch (String(payment ?? '').toUpperCase()) {
    case 'PAID': return 'success'
    case 'PARTIAL': return 'info'
    case 'UNPAID': return 'warning'
    default: return 'neutral'
  }
}

function label(value) {
  const text = String(value ?? '').replace(/_/g, ' ').toLowerCase()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '—'
}

/** What the last Refresh did, in one short sentence. */
function refreshNotice(refresh) {
  if (!refresh) return ''
  if (!refresh.refreshed) {
    return refresh.retryAfterSeconds
      ? `${refresh.reason}. Try again in ${refresh.retryAfterSeconds}s.`
      : refresh.reason || 'Could not refresh.'
  }
  if (refresh.linked === false) return 'No Filter customer found for this phone number.'
  return refresh.written > 0
    ? `Updated from Filter: ${refresh.written} order${refresh.written === 1 ? '' : 's'} changed.`
    : 'Already up to date with Filter.'
}

/**
 * Orders this customer placed at Filter workshops. They are copied into the
 * Rider database by the sync, so this list loads from Rider; Refresh asks the
 * backend to pull the latest from Filter for this one customer.
 */
function FilterOrdersSection({ customerId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [expanded, setExpanded] = useState(() => new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getCustomerFilterOrders(customerId, { limit: PAGE_SIZE }))
    } catch (err) {
      setError(err.message || 'Failed to load Filter orders')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => { load() }, [load])

  const refresh = async () => {
    setRefreshing(true)
    setError('')
    setNotice('')
    try {
      const result = await refreshCustomerFilterOrders(customerId, { limit: PAGE_SIZE })
      setData(result)
      setExpanded(new Set())
      setNotice(refreshNotice(result.refresh))
    } catch (err) {
      setError(err.message || 'Failed to refresh from Filter')
    } finally {
      setRefreshing(false)
    }
  }

  const loadMore = async () => {
    if (!data) return
    setLoadingMore(true)
    try {
      const next = await getCustomerFilterOrders(customerId, {
        limit: PAGE_SIZE,
        offset: data.items.length,
      })
      setData({ ...next, items: [...data.items, ...(next.items ?? [])] })
    } catch (err) {
      setError(err.message || 'Failed to load more orders')
    } finally {
      setLoadingMore(false)
    }
  }

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const items = Array.isArray(data?.items) ? data.items : []
  const summary = data?.summary
  const total = data?.total ?? 0

  return (
    <section className="dt-card fo-card">
      <div className="dt-toolbar">
        <h3 className="cd-card-title">
          <Store size={16} />
          Filter workshop orders
          <span className="cd-count">{total}</span>
        </h3>
        <div className="dt-toolbar-actions fo-actions">
          {data?.lastRefreshedAt && (
            <span className="dt-muted fo-last">
              Last refreshed {formatDate(data.lastRefreshedAt, true)}
            </span>
          )}
          <button
            type="button"
            className="dt-btn"
            onClick={refresh}
            disabled={refreshing || loading}
            title="Pull the latest orders for this customer from Filter"
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {summary && summary.totalOrders > 0 && (
        <div className="fo-summary">
          <div><span>Orders</span><strong>{summary.totalOrders}</strong></div>
          <div>
            <span>Total spent</span>
            <strong><span className="riyal-symbol">&#x20C1;</span>{money(summary.totalAmount)}</strong>
          </div>
          <div><span>Cancelled</span><strong>{summary.cancelledOrders}</strong></div>
          <div><span>First visit</span><strong>{formatDate(summary.firstOrderAt)}</strong></div>
          <div><span>Last visit</span><strong>{formatDate(summary.lastOrderAt)}</strong></div>
        </div>
      )}

      {(notice || error) && (
        <p className={`fo-notice ${error ? 'is-error' : ''}`}>{error || notice}</p>
      )}

      <TableScroll>
        <table className="dt-table" style={{ minWidth: 820 }}>
          <thead>
            <tr>
              <th className="dt-col-actions" aria-label="Expand" />
              <th>Invoice</th>
              <th>Workshop</th>
              <th>Vehicle</th>
              <th>Date</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="dt-state">
                  <Loader2 size={18} className="spin" /> Loading Filter orders…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="8" className="dt-state">
                  No Filter workshop orders for this customer yet.
                </td>
              </tr>
            ) : (
              items.map((order) => {
                const open = expanded.has(order.id)
                const lines = Array.isArray(order.items) ? order.items : []
                return (
                  <Fragment key={order.id}>
                    <tr className="is-clickable" onClick={() => toggle(order.id)}>
                      <td className="dt-col-actions">
                        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} className="dt-muted" />}
                      </td>
                      <td><strong>{order.order_no || '—'}</strong></td>
                      <td>{order.location_name || '—'}</td>
                      <td className="dt-muted">{order.vehicle_label || '—'}</td>
                      <td className="dt-muted">{formatDate(order.invoiced_at || order.ordered_at, true)}</td>
                      <td>
                        <span className={`dt-status dt-status--${statusTone(order.status)}`}>
                          {label(order.status)}
                        </span>
                      </td>
                      <td>
                        <span className={`dt-status dt-status--${paymentTone(order.payment_status)}`}>
                          {label(order.payment_status)}
                        </span>
                      </td>
                      <td>
                        <strong><span className="riyal-symbol">&#x20C1;</span>{money(order.total_amount)}</strong>
                      </td>
                    </tr>
                    {open && (
                      <tr className="fo-items-row">
                        <td />
                        <td colSpan="7">
                          {lines.length === 0 ? (
                            <span className="dt-muted">No line items.</span>
                          ) : (
                            <table className="fo-items">
                              <thead>
                                <tr>
                                  <th>Item</th>
                                  <th>Type</th>
                                  <th>Qty</th>
                                  <th>Unit price</th>
                                  <th>Line total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lines.map((line, i) => (
                                  <tr key={line.source_item_id ?? i}>
                                    <td>
                                      {line.name || '—'}
                                      {line.name_ar && <span className="fo-ar" dir="rtl">{line.name_ar}</span>}
                                    </td>
                                    <td className="dt-muted">{label(line.type)}</td>
                                    <td>{line.qty}</td>
                                    <td>{money(line.unit_price)}</td>
                                    <td>{money(line.line_total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          <div className="fo-totals dt-muted">
                            Subtotal {money(order.subtotal)}
                            {Number(order.discount_amount) > 0 && <> · Discount {money(order.discount_amount)}</>}
                            {' '}· VAT {money(order.vat_amount)} · Total {money(order.total_amount)} {order.currency}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </TableScroll>

      {!loading && items.length < total && (
        <div className="fo-more">
          <button type="button" className="dt-btn" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? <><Loader2 size={15} className="spin" /> Loading…</> : `Show more (${total - items.length} left)`}
          </button>
        </div>
      )}
    </section>
  )
}

export default FilterOrdersSection
