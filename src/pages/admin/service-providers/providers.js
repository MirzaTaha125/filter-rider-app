/** Shared helpers for the service-provider screens. */

export const PROVIDER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED']
export const LIVE_STATUSES = ['ONLINE', 'OFFLINE', 'BUSY']

/** API returns ONLINE/OFFLINE/BUSY; normalise anything else to OFFLINE. */
export function normalizeAvailability(value) {
  const upper = String(value ?? '').toUpperCase()
  return LIVE_STATUSES.includes(upper) ? upper : 'OFFLINE'
}

export function titleCase(value) {
  if (!value) return '—'
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

export function statusTone(status) {
  switch (String(status ?? '').toUpperCase()) {
    case 'ACTIVE':
      return 'success'
    case 'SUSPENDED':
      return 'danger'
    case 'INACTIVE':
      return 'muted'
    default:
      return 'pending'
  }
}

export function availabilityTone(value) {
  switch (normalizeAvailability(value)) {
    case 'ONLINE':
      return 'online'
    case 'BUSY':
      return 'busy'
    default:
      return 'offline'
  }
}

/** Zones expose `zone_name`, not `name`. */
export function zoneLabel(zone) {
  if (zone == null) return '—'
  if (typeof zone === 'string') return zone
  return zone.zone_name ?? zone.city ?? '—'
}

export function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'SP'
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

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

/** Flatten a provider row from the list endpoint into what the table renders. */
export function mapProviderRow(item) {
  return {
    id: item.id ?? item._id,
    name: item.full_name ?? item.name ?? '—',
    phone: item.phone ?? '—',
    email: item.email ?? '—',
    status: item.provider_status ?? item.user_status ?? item.status ?? 'PENDING',
    availability: normalizeAvailability(item.liveStatus ?? item.live_status ?? item.availability),
    zone: zoneLabel(item.zone),
    rating: item.stats?.rating ?? item.rating ?? 0,
    totalOrders: item.stats?.totalOrders ?? item.total_orders ?? item.totalOrders ?? 0,
    totalEarnings: item.stats?.totalEarnings ?? item.total_earnings ?? item.totalEarnings ?? 0,
    verified: item.verification_status === 'VERIFIED' || item.verified === true,
    joinDate: item.created_at ?? item.joinDate ?? item.join_date ?? null,
    avatar: item.avatar ?? null,
  }
}
