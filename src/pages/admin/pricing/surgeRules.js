/** Shared surge-rule helpers used by the overview and the configure form. */

export const DEMAND_LEVELS = ['LOW', 'NORMAL', 'HIGH']

export const DEMAND_LABELS = {
  LOW: 'Low Demand',
  NORMAL: 'Normal',
  HIGH: 'High Demand',
}

export const DEMAND_BLURBS = {
  LOW: 'Plenty of providers free — discount to drive bookings.',
  NORMAL: 'Balanced supply — charge the standard price.',
  HIGH: 'Few providers free — raise the price to manage demand.',
}

/** Shown before anything has been saved. */
export const DEFAULT_RULES = [
  { demand_level: 'LOW', multiplier: 0.8, min_availability: 80, max_availability: 100, is_active: true },
  { demand_level: 'NORMAL', multiplier: 1.0, min_availability: 40, max_availability: 79, is_active: true },
  { demand_level: 'HIGH', multiplier: 1.5, min_availability: 0, max_availability: 39, is_active: true },
]

/** The API returns multiplier as a decimal string; normalise it for the UI. */
export function normaliseRule(rule) {
  return {
    demand_level: rule.demand_level,
    multiplier: Number(rule.multiplier ?? 1),
    min_availability: Number(rule.min_availability ?? 0),
    max_availability: Number(rule.max_availability ?? 100),
    is_active: rule.is_active !== false,
  }
}

/** Always return all three levels, in order, filling gaps with defaults. */
export function orderRules(rules) {
  const byLevel = new Map((rules ?? []).map(r => [r.demand_level, normaliseRule(r)]))
  return DEMAND_LEVELS.map(
    level => byLevel.get(level) ?? DEFAULT_RULES.find(r => r.demand_level === level),
  )
}

export function conditionText(rule) {
  if (rule.min_availability <= 0) return `Provider availability below ${rule.max_availability + 1}%`
  if (rule.max_availability >= 100) return `Provider availability ${rule.min_availability}% and above`
  return `Provider availability ${rule.min_availability}–${rule.max_availability}%`
}

/**
 * The three bands are meant to partition 0–100% availability. Report any
 * availability values that no active rule covers, or that two rules claim.
 */
export function checkCoverage(rules) {
  const active = rules.filter(r => r.is_active)
  const gaps = []
  const overlaps = []

  for (let pct = 0; pct <= 100; pct += 1) {
    const hits = active.filter(r => pct >= r.min_availability && pct <= r.max_availability)
    if (hits.length === 0) gaps.push(pct)
    else if (hits.length > 1) overlaps.push(pct)
  }

  return {
    gaps: toRanges(gaps),
    overlaps: toRanges(overlaps),
  }
}

/** Collapse [1,2,3,7,8] into ['1–3', '7–8'] for readable messages. */
function toRanges(values) {
  const ranges = []
  let start = null
  let prev = null

  for (const value of values) {
    if (start === null) {
      start = value
    } else if (value !== prev + 1) {
      ranges.push(start === prev ? `${start}%` : `${start}–${prev}%`)
      start = value
    }
    prev = value
  }
  if (start !== null) ranges.push(start === prev ? `${start}%` : `${start}–${prev}%`)
  return ranges
}
