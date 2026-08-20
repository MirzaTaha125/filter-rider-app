import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal, Loader2, AlertTriangle, TrendingUp } from 'lucide-react'
import { getSurgeRules } from '../../../api/pricing.js'
import {
  DEMAND_LABELS,
  DEMAND_BLURBS,
  DEFAULT_RULES,
  orderRules,
  conditionText,
  checkCoverage,
} from './surgeRules.js'
import './SurgePricing.css'

function SurgePricing() {
  const navigate = useNavigate()
  const [rules, setRules] = useState(DEFAULT_RULES)
  const [usingDefaults, setUsingDefaults] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    getSurgeRules()
      .then(data => {
        if (cancelled) return
        const saved = Array.isArray(data) ? data : []
        setUsingDefaults(saved.length === 0)
        setRules(orderRules(saved.length > 0 ? saved : DEFAULT_RULES))
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Failed to load surge rules')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  const { gaps, overlaps } = checkCoverage(rules)

  return (
    <div className="surge-pricing">
      <header className="sp-header">
        <div>
          <h1 className="sp-title">Surge Pricing</h1>
          <p className="sp-subtitle">
            Multipliers applied to the quoted price based on how many providers are free.
          </p>
        </div>
        <button
          className="sp-btn sp-btn--primary"
          onClick={() => navigate('/admin/pricing/surge/configure')}
          disabled={loading}
        >
          <SlidersHorizontal size={18} />
          Configure Rules
        </button>
      </header>

      {error && (
        <div className="sp-alert sp-alert--error">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {!loading && usingDefaults && !error && (
        <div className="sp-alert sp-alert--info">
          <AlertTriangle size={16} />
          <span>
            No surge rules have been saved yet — these are suggested defaults and are not live.
            Open <strong>Configure Rules</strong> and save to activate them.
          </span>
        </div>
      )}

      {!loading && !usingDefaults && (gaps.length > 0 || overlaps.length > 0) && (
        <div className="sp-alert sp-alert--warn">
          <AlertTriangle size={16} />
          <span>
            {gaps.length > 0 && <>No active rule covers {gaps.join(', ')} availability. </>}
            {overlaps.length > 0 && <>More than one rule covers {overlaps.join(', ')}. </>}
            Bookings in those ranges may be priced unpredictably.
          </span>
        </div>
      )}

      {loading ? (
        <div className="sp-state">
          <Loader2 size={32} className="spin" />
          <span>Loading surge rules…</span>
        </div>
      ) : (
        <div className="sp-grid">
          {rules.map(rule => (
            <article
              key={rule.demand_level}
              className={`sp-card sp-card--${rule.demand_level.toLowerCase()} ${rule.is_active ? '' : 'is-inactive'}`}
            >
              <header className="sp-card-top">
                <span className="sp-card-icon"><TrendingUp size={18} /></span>
                <span className={`sp-badge ${rule.is_active ? 'is-active' : 'is-inactive'}`}>
                  {rule.is_active ? 'Active' : 'Inactive'}
                </span>
              </header>

              <h2 className="sp-card-title">{DEMAND_LABELS[rule.demand_level]}</h2>
              <p className="sp-card-blurb">{DEMAND_BLURBS[rule.demand_level]}</p>

              <p className="sp-multiplier">
                {rule.multiplier.toFixed(2)}<span>×</span>
              </p>

              <p className="sp-condition">{conditionText(rule)}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default SurgePricing
