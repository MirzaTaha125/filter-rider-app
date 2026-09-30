import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, Search, Star, ScrollText } from 'lucide-react'
import { getAdminReviews } from '../../../api'
import '../wallet/PaymentApproval.css'
import './Reviews.css'

const PAGE_SIZE = 20

const TABS = [
  { id: 'services', label: 'Services' },
  { id: 'customers', label: 'Customers' },
  { id: 'service_providers', label: 'Service Providers' },
]

function formatDate(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return String(value)
  }
}

function Stars({ value }) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return <span className="reviews-muted">—</span>
  return (
    <span className="reviews-stars">
      <Star size={13} fill="currentColor" strokeWidth={0} />
      {n.toFixed(1)}
    </span>
  )
}

function Reviews() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('services')
  const [search, setSearch] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearchApplied(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async (nextPage, replace) => {
    replace ? setLoading(true) : setLoadingMore(true)
    setError('')
    try {
      const data = await getAdminReviews({
        tab,
        search: searchApplied || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      })
      const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      const count = Number(data?.total ?? rows.length)
      setItems((prev) => (replace ? rows : [...prev, ...rows]))
      setTotal(count)
      setPage(nextPage)
    } catch (err) {
      setError(err.message || 'Failed to load reviews')
      if (replace) setItems([])
    } finally {
      replace ? setLoading(false) : setLoadingMore(false)
    }
  }, [tab, searchApplied])

  useEffect(() => { load(1, true) }, [load])

  const hasMore = items.length < total

  const openOrder = (orderId) => {
    if (!orderId) return
    navigate(`/admin/orders/${orderId}`)
  }

  const openCustomer = (customerId) => {
    if (!customerId) return
    navigate(`/admin/customers/${customerId}`)
  }

  const openProvider = (providerId) => {
    if (!providerId) return
    navigate(`/admin/service-providers/${providerId}`)
  }

  const subtitle = {
    services: 'Customer ratings for each booked service.',
    customers: 'Provider ratings of customers.',
    service_providers: 'Customer ratings of service providers.',
  }[tab]

  return (
    <div className="payment-approval reviews-page">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">{subtitle}</p>
        </div>
      </header>

      <div className="pv-stats">
        <div className="pv-stat">
          <span className="pv-stat-label">{TABS.find((t) => t.id === tab)?.label}</span>
          <span className="pv-stat-value">{loading ? '—' : total.toLocaleString()}</span>
        </div>
      </div>

      <div className="pv-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`pv-tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="reviews-toolbar">
        <div className="reviews-search">
          <Search size={16} aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order, customer, provider, service, or comment"
            aria-label="Search reviews"
          />
        </div>
      </div>

      {error && (
        <div className="pv-alert">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="dt-empty">
          <Loader2 size={20} className="spin" />
          <span>Loading reviews…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="dt-empty">
          <ScrollText size={28} />
          <h2>No reviews found</h2>
          <p>Nothing matches this tab{searchApplied ? ' and search' : ''} yet.</p>
        </div>
      ) : (
        <>
          <div className="reviews-grid">
            {items.map((row) => (
              <article key={row.id} className="reviews-card">
                <div className="reviews-card-top">
                  {row.order_id ? (
                    <button
                      type="button"
                      className="reviews-order-link"
                      onClick={() => openOrder(row.order_id)}
                    >
                      {row.order_no || 'Order'}
                    </button>
                  ) : (
                    <span className="reviews-muted">—</span>
                  )}
                  <span className="reviews-card-date">{formatDate(row.created_at)}</span>
                </div>

                {tab === 'services' && (
                  <h3 className="reviews-card-title">{row.service_name || 'Service'}</h3>
                )}

                <div className="reviews-card-meta">
                  {row.customer_id ? (
                    <button
                      type="button"
                      className="reviews-party-link"
                      onClick={() => openCustomer(row.customer_id)}
                    >
                      {row.customer_name || 'Customer'}
                    </button>
                  ) : (
                    <span>{row.customer_name || 'Customer'}</span>
                  )}
                  <span className="reviews-dot" aria-hidden />
                  {row.provider_id ? (
                    <button
                      type="button"
                      className="reviews-party-link"
                      onClick={() => openProvider(row.provider_id)}
                    >
                      {row.provider_name || 'Provider'}
                    </button>
                  ) : (
                    <span>{row.provider_name || 'Provider'}</span>
                  )}
                </div>

                <div className="reviews-card-scores">
                  {tab === 'services' ? (
                    <>
                      <span><em>Service</em> <Stars value={row.service_rating ?? row.rating} /></span>
                      <span><em>Provider</em> <Stars value={row.rating} /></span>
                    </>
                  ) : (
                    <span><Stars value={row.rating} /></span>
                  )}
                </div>

                {row.comment?.trim() ? (
                  <p className="reviews-card-comment">{row.comment}</p>
                ) : null}
              </article>
            ))}
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

export default Reviews
