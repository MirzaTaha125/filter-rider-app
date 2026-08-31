/**
 * Order status buckets, taken from the OrderStatus enum in
 * filter-rider-live/prisma/schema/models/order/enum/order-status.enum.prisma
 *
 *   CREATED → BROADCASTED → ASSIGNED → ACCEPTED → ON_THE_WAY → ARRIVED
 *           → IN_PROGRESS → COMPLETED,  plus CANCELLED
 *
 * The dashboard previously filtered on 'BROADCASTING' and 'PENDING', neither of
 * which exists, and never mentioned ASSIGNED — so those orders counted as
 * nothing at all and every tile read zero.
 */

/** Not out to providers yet — the only genuinely idle state. */
export const PENDING_STATUSES = ['CREATED']

/**
 * Live work. BROADCASTED and ASSIGNED are included deliberately: once an order
 * is out to providers it is operationally active, even though nobody has
 * accepted it yet, and it needs to show up on the Active tile and the map.
 */
export const ACTIVE_STATUSES = [
  'BROADCASTED', 'ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS',
]

/** Everything still open — what belongs on the operations map. */
export const OPEN_STATUSES = [...PENDING_STATUSES, ...ACTIVE_STATUSES]

export const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED']

export function normalizeStatus(value) {
  return String(value ?? '').trim().toUpperCase()
}

export const isPending = (order) => PENDING_STATUSES.includes(normalizeStatus(order?.status))
export const isActive = (order) => ACTIVE_STATUSES.includes(normalizeStatus(order?.status))
export const isOpen = (order) => OPEN_STATUSES.includes(normalizeStatus(order?.status))
export const isBroadcasted = (order) => normalizeStatus(order?.status) === 'BROADCASTED'

/** One pass over the list rather than four filters. */
export function countOrderStatuses(orders = []) {
  const counts = {
    total: orders.length,
    pending: 0,
    active: 0,
    broadcasted: 0,
    unassigned: 0,
    completed: 0,
    cancelled: 0,
  }

  for (const order of orders) {
    const status = normalizeStatus(order.status)
    if (PENDING_STATUSES.includes(status)) counts.pending += 1
    if (ACTIVE_STATUSES.includes(status)) counts.active += 1
    if (status === 'BROADCASTED') counts.broadcasted += 1
    if (status === 'COMPLETED') counts.completed += 1
    if (status === 'CANCELLED') counts.cancelled += 1
    if (OPEN_STATUSES.includes(status) && !order.provider_id) counts.unassigned += 1
  }

  return counts
}

/** Presence values come from the PresenceStatus enum: ONLINE | BUSY | OFFLINE. */
export function countProviderPresence(providers = []) {
  const counts = { total: providers.length, online: 0, busy: 0, offline: 0 }

  for (const provider of providers) {
    switch (normalizeStatus(provider.availability)) {
      case 'ONLINE': counts.online += 1; break
      case 'BUSY': counts.busy += 1; break
      default: counts.offline += 1
    }
  }

  return counts
}
