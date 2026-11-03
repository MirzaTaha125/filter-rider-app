import { useState, useEffect, useCallback } from 'react'
import { Calendar, Store, AlertTriangle, Search, RefreshCw } from 'lucide-react'
import { getAdminWorkshopOffers, setWorkshopOfferActive } from '../../../api'
import { ListCardsShimmer } from '../../../components/Shimmer/Shimmer'
import Pager from '../../../components/DataTable/Pager'
import { usePagedRows } from '../../../components/DataTable/usePagedRows'

// Where an offer stands (computed by the API): badge text, badge tone, explanation.
const STATES = {
  LIVE: { label: 'Live', tone: 'active', hint: 'Shown in the Rider app now.' },
  HIDDEN_IN_RIDER: { label: 'Hidden', tone: 'inactive', hint: 'Switched off here, so the Rider app does not show it. The ERP is not changed.' },
  OFF_IN_ERP: { label: 'Off in ERP', tone: 'draft', hint: '"Show on Rider app" is off in the ERP (or the ERP promotion is not approved). It will not show until the ERP turns it on.' },
  SCHEDULED: { label: 'Scheduled', tone: 'draft', hint: 'Starts later; it will show from its start date.' },
  EXPIRED: { label: 'Expired', tone: 'expired', hint: 'Its end date has passed.' },
}

const STATE_FILTERS = ['ALL', 'LIVE', 'HIDDEN_IN_RIDER', 'OFF_IN_ERP', 'SCHEDULED', 'EXPIRED']

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function discountLabel(offer) {
  if (offer.discount_value === null || offer.discount_value === undefined) return null
  const value = Number(offer.discount_value)
  if (String(offer.discount_type || '').toLowerCase().startsWith('percent')) return `${value}% off`
  return { fixed: value }
}

function dateLabel(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString()
}

function periodLabel(offer) {
  const from = dateLabel(offer.valid_from)
  const to = dateLabel(offer.valid_to)
  if (from && to) return `${from} – ${to}`
  if (to) return `Until ${to}`
  if (from) return `From ${from}`
  return 'No end date'
}

/**
 * ERP workshop offers ("visit a Filter workshop and get …") shown in the Rider
 * app. Display only. The switch here hides or shows an offer in the Rider app
 * only; the ERP keeps its own "Show on Rider app" switch.
 */
function WorkshopOffersTab({ onCount }) {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('ALL')
  const [togglingIds, setTogglingIds] = useState(new Set())

  const load = useCallback(async () => {
    setError('')
    try {
      const list = toArray(await getAdminWorkshopOffers())
      setOffers(list)
      onCount?.(list.length)
    } catch (err) {
      setError(err.message || 'Failed to load workshop offers')
      setOffers([])
      onCount?.(0)
    } finally {
      setLoading(false)
    }
  }, [onCount])

  useEffect(() => { load() }, [load])

  const toggleOffer = async (offer) => {
    if (togglingIds.has(offer.id)) return
    setTogglingIds(prev => new Set(prev).add(offer.id))
    setError('')
    try {
      const updated = await setWorkshopOfferActive(offer.id, !offer.rider_active)
      setOffers(prev => prev.map(o => (o.id === offer.id ? { ...o, ...updated } : o)))
    } catch (err) {
      setError(err.message || 'Failed to update the offer')
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(offer.id)
        return next
      })
    }
  }

  const term = search.trim().toLowerCase()
  const visible = offers.filter(offer => {
    const matchesState = stateFilter === 'ALL' || offer.state === stateFilter
    const matchesTerm =
      !term ||
      (offer.title || '').toLowerCase().includes(term) ||
      (offer.code || '').toLowerCase().includes(term) ||
      (offer.workshop_name || '').toLowerCase().includes(term)
    return matchesState && matchesTerm
  })
  const { pageRows, pagerProps } = usePagedRows(visible, {
    defaultLimit: 20,
    resetKey: `${stateFilter}|${term}`,
  })

  const liveCount = offers.filter(o => o.state === 'LIVE').length

  return (
    <>
      <div className="pm2-toolbar">
        <div className="pm2-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by title, code or workshop…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="pm2-filter"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
        >
          {STATE_FILTERS.map(s => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All states' : STATES[s].label}
            </option>
          ))}
        </select>
        <button
          className="pm2-btn pm2-btn--ghost"
          onClick={() => { setLoading(true); load() }}
          disabled={loading}
          title="Reload"
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Reload
        </button>
        <span className="pm2-count">
          {loading ? '—' : `${visible.length} of ${offers.length} · ${liveCount} live`}
        </span>
      </div>

      <p className="pm2-tab-note">
        Offers published from the ERP marketing portal. They are shown in the app only and are
        redeemed at the workshop. The switch below hides or shows an offer in the Rider app only.
      </p>

      {error && (
        <div className="pm2-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {loading ? (
        <ListCardsShimmer />
      ) : offers.length === 0 ? (
        <div className="pm2-state">
          <Store size={32} />
          <h2>No workshop offers yet</h2>
          <p>Turn on "Show on Rider app" for a promotion in the ERP marketing portal.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="pm2-state">
          <Search size={32} />
          <h2>No matches</h2>
          <p>No offers match the current search or filter.</p>
        </div>
      ) : (
        <div className="pm2-grid">
          {pageRows.map(offer => {
            const toggling = togglingIds.has(offer.id)
            const state = STATES[offer.state] ?? STATES.OFF_IN_ERP
            const discount = discountLabel(offer)
            const branches = toArray(offer.branch_names)

            return (
              <article key={offer.id} className={`pm2-card ${offer.state === 'LIVE' ? '' : 'is-inactive'}`}>
                {offer.banner_image_url && (
                  <img className="pm2-offer-banner" src={offer.banner_image_url} alt="" loading="lazy" />
                )}

                <header className="pm2-card-top">
                  <span className="pm2-card-icon"><Store size={18} /></span>
                  <div className="pm2-card-id">
                    <strong className="pm2-code">{offer.title || offer.code || 'Workshop offer'}</strong>
                    {discount && (
                      <span className="pm2-discount">
                        {typeof discount === 'string'
                          ? discount
                          : <><span className="riyal-symbol">&#x20C1;</span>{discount.fixed} off</>}
                      </span>
                    )}
                  </div>
                  <span className={`pm2-badge pm2-badge--${state.tone}`} title={state.hint}>
                    {state.label}
                  </span>
                </header>

                <p className="pm2-erp-badge" title="Published from the ERP marketing portal">From ERP</p>

                {offer.subtitle && <p className="pm2-card-title">{offer.subtitle}</p>}

                <ul className="pm2-offer-meta">
                  {offer.code && <li><span>Code</span><strong>{offer.code}</strong></li>}
                  {offer.workshop_name && <li><span>Workshop</span><strong>{offer.workshop_name}</strong></li>}
                  {branches.length > 0 && <li><span>Branches</span><strong>{branches.join(', ')}</strong></li>}
                </ul>

                <p className="pm2-expiry pm2-expiry--muted">
                  <Calendar size={14} />
                  {periodLabel(offer)}
                </p>

                <p className="pm2-offer-hint">{state.hint}</p>

                <footer className="pm2-card-actions">
                  <label
                    className="pm2-toggle"
                    title={offer.rider_active ? 'Hide in the Rider app' : 'Show in the Rider app'}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(offer.rider_active)}
                      onChange={() => toggleOffer(offer)}
                      disabled={toggling}
                    />
                    <span className="pm2-toggle-track"><span className="pm2-toggle-thumb" /></span>
                    <span className="pm2-toggle-text">
                      {toggling ? 'Saving…' : offer.rider_active ? 'On in Rider' : 'Off in Rider'}
                    </span>
                  </label>
                </footer>
              </article>
            )
          })}
        </div>
      )}
      {pageRows.length > 0 && (
        <div className="dt-pager-wrap">
          <Pager {...pagerProps} unit="offers" />
        </div>
      )}
    </>
  )
}

export default WorkshopOffersTab
