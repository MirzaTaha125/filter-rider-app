import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react'
import { compact } from './compact'
import './StatTile.css'

/**
 * One headline number as a small card: label, value, and either a signed delta
 * against a named period or a plain hint. Deltas render only when a real
 * comparison exists — a fabricated "0%" would read as fact.
 *
 * Pass `onClick` to make the tile actionable; it then renders as a real button
 * (keyboard reachable, with an affordance arrow) rather than a clickable div.
 */
function StatTile({ label, value, money, delta, deltaLabel, hint, tone, onClick, title }) {
  const empty = value === null || value === undefined
  const up = typeof delta === 'number' && delta >= 0
  const Arrow = up ? TrendingUp : TrendingDown
  const clickable = typeof onClick === 'function'

  const body = (
    <>
      <span className="stat-tile-label">
        {label}
        {clickable && <ArrowUpRight size={14} className="stat-tile-go" />}
      </span>
      <span className={`stat-tile-value ${tone ? `is-${tone}` : ''}`}>
        {empty ? '—' : (
          <>
            {money && <span className="riyal-symbol">&#x20C1;</span>}
            {compact(value)}
          </>
        )}
      </span>
      {typeof delta === 'number' ? (
        <span className={`stat-tile-delta ${up ? 'is-up' : 'is-down'}`}>
          <Arrow size={13} />
          {up ? '+' : ''}{delta.toFixed(1)}%
          {deltaLabel && <em>{deltaLabel}</em>}
        </span>
      ) : hint ? (
        <span className="stat-tile-hint">{hint}</span>
      ) : null}
    </>
  )

  if (!clickable) {
    return <div className="stat-tile">{body}</div>
  }

  return (
    <button
      type="button"
      className="stat-tile is-clickable"
      onClick={onClick}
      title={title ?? `Open ${label}`}
    >
      {body}
    </button>
  )
}

export default StatTile
