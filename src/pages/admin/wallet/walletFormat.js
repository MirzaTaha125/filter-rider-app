/** Formatting shared by every wallet screen. */

export function formatMoney(value) {
  return Number(value ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(value, withTime = false) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return withTime ? d.toLocaleString() : d.toLocaleDateString()
}

/** Unwrap the `{ items, pagination: { total } }` envelope the admin endpoints return. */
export function unwrapList(data) {
  if (Array.isArray(data)) return { items: data, total: data.length }
  const items = Array.isArray(data?.items) ? data.items : []
  const total = data?.pagination?.total ?? data?.total ?? items.length
  return { items, total }
}
