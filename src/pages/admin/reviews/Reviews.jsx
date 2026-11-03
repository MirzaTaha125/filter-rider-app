import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Search, Star, ScrollText } from 'lucide-react'
import { getAdminReviews } from '../../../api'
import '../wallet/PaymentApproval.css'
import './Reviews.css'
import Pager from '../../../components/DataTable/Pager'
import { ReviewCardsShimmer } from '../../../components/Shimmer/Shimmer'


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

function monogram(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function PartyAvatar({ name, src }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return <span className="reviews-avatar" aria-hidden="true">{monogram(name)}</span>
  }
  return (
    <span className="reviews-avatar" aria-hidden="true">
      <img src={src} alt="" onError={() => setBroken(true)} />
    </span>
  )
}

function ReviewParty({ name, avatar, onClick }) {
  const label = name || '—'
  const inner = (
    <>
      <PartyAvatar name={label} src={avatar} />
      <span className="reviews-party-name">{label}</span>
    </>
  )
  if (!onClick) return <span className="reviews-party">{inner}</span>
  return (
    <button type="button" className="reviews-party reviews-party-link" onClick={onClick}>
      {inner}
    </button>
  )
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
  const [limit, setLimit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tabCounts, setTabCounts] = useState({})

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchApplied(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async (pageNo) => {
    setLoading(true)
    setError('')
    try {
      const data = await getAdminReviews({
        tab,
        search: searchApplied || undefined,
        page: pageNo,
        limit,
      })
      const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      const count = Number(data?.total ?? rows.length)
      setItems(rows)
      setTotal(count)
    } catch (err) {
      setError(err.message || 'Failed to load reviews')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [tab, searchApplied, limit])

  useEffect(() => { load(page) }, [load, page])

  useEffect(() => {
    if (loading) return
    setTabCounts((prev) => (prev[tab] === total ? prev : { ...prev, [tab]: total }))
  }, [loading, tab, total])

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

      <div className="pv-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`pv-tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => { setTab(t.id); setPage(1) }}
          >
            {t.label}
            {tabCounts[t.id] != null && <span className="tab-count">{tabCounts[t.id]}</span>}
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
        <ReviewCardsShimmer />
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
                  <ReviewParty
                    name={row.customer_name || 'Customer'}
                    avatar={row.customer_avatar}
                    onClick={row.customer_id ? () => openCustomer(row.customer_id) : null}
                  />
                  <ReviewParty
                    name={row.provider_name || 'Provider'}
                    avatar={row.provider_avatar}
                    onClick={row.provider_id ? () => openProvider(row.provider_id) : null}
                  />
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

          <div className="pv-pager">
            <Pager
              page={page}
              total={total}
              limit={limit}
              onChange={setPage}
              onLimitChange={(n) => { setLimit(n); setPage(1) }}
              unit="reviews"
              disabled={loading}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default Reviews
