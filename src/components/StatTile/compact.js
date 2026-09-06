/**
 * Compact display for headline figures: 1,284 · 12.9K · 4.2M
 * Kept out of StatTile.jsx so that file only exports its component — mixing
 * the two breaks React Fast Refresh.
 */
export function compact(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
