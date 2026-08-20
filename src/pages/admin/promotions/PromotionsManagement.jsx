import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Calendar, Tag, Loader2, AlertTriangle, Search,
} from 'lucide-react'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import { getPromotions, updatePromotionStatus, deletePromotion } from '../../../api'
import './PromotionsManagement.css'

const STATUS_FILTERS = ['ALL', 'DRAFT', 'ACTIVE', 'INACTIVE', 'EXPIRED']

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function discountLabel(promo) {
  const value = Number(promo.discount_value ?? 0)
  if (promo.discount_type === 'PERCENTAGE') return `${value}% off`
  return { fixed: value }
}

function expiryLabel(promo) {
  // The API already computes this against server time — prefer it over
  // recalculating from valid_to in the browser's timezone.
  const days = promo.expires_in_days
  if (days === null || days === undefined) return { text: 'No expiry', tone: 'muted' }
  if (days < 0) return { text: 'Expired', tone: 'danger' }
  if (days === 0) return { text: 'Expires today', tone: 'warn' }
  if (days === 1) return { text: 'Expires tomorrow', tone: 'warn' }
  return { text: `Expires in ${days} days`, tone: days <= 7 ? 'warn' : 'muted' }
}

function PromotionsManagement() {
  const navigate = useNavigate()

  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [togglingIds, setTogglingIds] = useState(new Set())
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setError('')
    try {
      setPromotions(toArray(await getPromotions()))
    } catch (err) {
      setError(err.message || 'Failed to load promotions')
      setPromotions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const togglePromotion = async (promo) => {
    if (togglingIds.has(promo.id)) return
    const nextActive = !promo.is_active
    const nextStatus = nextActive ? 'ACTIVE' : 'DRAFT'

    setTogglingIds(prev => new Set(prev).add(promo.id))
    setError('')
    try {
      await updatePromotionStatus(promo.id, nextStatus, nextActive)
      setPromotions(prev => prev.map(p =>
        p.id === promo.id ? { ...p, is_active: nextActive, status: nextStatus } : p,
      ))
    } catch (err) {
      setError(err.message || 'Failed to update status')
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(promo.id)
        return next
      })
    }
  }

  const askDelete = (promo) => {
    const used = promo.usage_count ?? 0
    setConfirm({
      promo,
      message: used > 0
        // PromotionUsage cascades on delete, so the redemption history goes too.
        ? `Delete "${promo.code}"? It has been redeemed ${used} time${used === 1 ? '' : 's'}, and that redemption history will be deleted with it.`
        : `Delete "${promo.code}"? This cannot be undone.`,
    })
  }

  const handleDelete = async (promo) => {
    const previous = promotions
    setPromotions(list => list.filter(p => p.id !== promo.id))
    try {
      await deletePromotion(promo.id)
    } catch (err) {
      setPromotions(previous)
      setError(err.message || 'Failed to delete promotion')
    }
  }

  const term = search.trim().toLowerCase()
  const visible = promotions.filter(promo => {
    const matchesStatus = statusFilter === 'ALL' || promo.status === statusFilter
    const matchesTerm =
      !term ||
      (promo.code || '').toLowerCase().includes(term) ||
      (promo.title || '').toLowerCase().includes(term)
    return matchesStatus && matchesTerm
  })

  const activeCount = promotions.filter(p => p.is_active).length

  return (
    <div className="promotions-management">
      <header className="pm2-header">
        <div>
          <h1 className="pm2-title">Promotions &amp; Coupons</h1>
          <p className="pm2-subtitle">Discount codes and promotional campaigns.</p>
        </div>
        <button
          className="pm2-btn pm2-btn--primary"
          onClick={() => navigate('/admin/promotions/create')}
        >
          <Plus size={18} />
          Create Coupon
        </button>
      </header>

      <div className="pm2-toolbar">
        <div className="pm2-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by code or title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="pm2-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_FILTERS.map(s => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All statuses' : s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <span className="pm2-count">
          {loading ? '—' : `${visible.length} of ${promotions.length} · ${activeCount} active`}
        </span>
      </div>

      {error && (
        <div className="pm2-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {loading ? (
        <div className="pm2-state">
          <Loader2 size={32} className="spin" />
          <span>Loading promotions…</span>
        </div>
      ) : promotions.length === 0 ? (
        <div className="pm2-state">
          <Tag size={32} />
          <h2>No promotions yet</h2>
          <p>Create a coupon to start running discounts.</p>
          <button className="pm2-btn pm2-btn--primary" onClick={() => navigate('/admin/promotions/create')}>
            <Plus size={16} /> Create Coupon
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="pm2-state">
          <Search size={32} />
          <h2>No matches</h2>
          <p>No promotions match the current search or filter.</p>
        </div>
      ) : (
        <div className="pm2-grid">
          {visible.map(promo => {
            const toggling = togglingIds.has(promo.id)
            const expiry = expiryLabel(promo)
            const discount = discountLabel(promo)
            const used = promo.usage_count ?? 0
            const limit = promo.total_usage_limit ?? null
            const pct = limit ? Math.min((used / limit) * 100, 100) : 0

            return (
              <article key={promo.id} className={`pm2-card ${promo.is_active ? '' : 'is-inactive'}`}>
                <header className="pm2-card-top">
                  <span className="pm2-card-icon"><Tag size={18} /></span>
                  <div className="pm2-card-id">
                    <strong className="pm2-code">{promo.code}</strong>
                    <span className="pm2-discount">
                      {typeof discount === 'string'
                        ? discount
                        : <><span className="riyal-symbol">&#x20C1;</span>{discount.fixed} off</>}
                    </span>
                  </div>
                  <span className={`pm2-badge pm2-badge--${(promo.status || 'draft').toLowerCase()}`}>
                    {promo.status ?? (promo.is_active ? 'ACTIVE' : 'DRAFT')}
                  </span>
                </header>

                {promo.title && <p className="pm2-card-title">{promo.title}</p>}

                {limit !== null && (
                  <div className="pm2-usage">
                    <div className="pm2-usage-head">
                      <span>Usage</span>
                      <span>{used} / {limit}</span>
                    </div>
                    <div className="pm2-usage-bar">
                      <div className="pm2-usage-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                {limit === null && used > 0 && (
                  <p className="pm2-usage-plain">Redeemed {used} time{used === 1 ? '' : 's'} · no limit</p>
                )}

                <p className={`pm2-expiry pm2-expiry--${expiry.tone}`}>
                  <Calendar size={14} />
                  {expiry.text}
                </p>

                <footer className="pm2-card-actions">
                  <label className="pm2-toggle" title={promo.is_active ? 'Deactivate' : 'Activate'}>
                    <input
                      type="checkbox"
                      checked={promo.is_active ?? false}
                      onChange={() => togglePromotion(promo)}
                      disabled={toggling}
                    />
                    <span className="pm2-toggle-track"><span className="pm2-toggle-thumb" /></span>
                    <span className="pm2-toggle-text">
                      {toggling ? 'Saving…' : promo.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </label>

                  <div className="pm2-row-actions">
                    <button
                      className="pm2-icon-btn"
                      onClick={() => navigate(`/admin/promotions/edit/${promo.id}`)}
                      title={`Edit ${promo.code}`}
                      aria-label={`Edit ${promo.code}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="pm2-icon-btn pm2-icon-btn--danger"
                      onClick={() => askDelete(promo)}
                      title={`Delete ${promo.code}`}
                      aria-label={`Delete ${promo.code}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </footer>
              </article>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete promotion"
        message={confirm?.message}
        confirmLabel="Delete promotion"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const pending = confirm
          setConfirm(null)
          if (pending) handleDelete(pending.promo)
        }}
      />
    </div>
  )
}

export default PromotionsManagement
