/**
 * Field helpers for provider withdrawal requests (a.k.a. payment approvals).
 *
 * The API returns raw Prisma rows, so relations come back camelCased
 * (`bankAccount`) while columns stay snake_cased (`requested_at`).
 */
export { formatMoney, formatDate, unwrapList } from './walletFormat.js'

/**
 * Statuses offered as tabs. The enum also has PAID and CANCELLED, but those are
 * deliberately not browsable here — a record in either state still renders
 * correctly if opened directly.
 */
export const WITHDRAWAL_STATUS_TABS = ['PENDING', 'APPROVED', 'REJECTED']

/** Statuses an admin can still act on. */
export const ACTIONABLE_STATUSES = ['PENDING']

export function ownerType(item) {
  const raw = (item?.owner_type || item?.ownerType || '').toString().toUpperCase()
  if (raw === 'CUSTOMER') return 'CUSTOMER'
  if (raw === 'PROVIDER') return 'PROVIDER'
  if (item?.customer && !item?.provider) return 'CUSTOMER'
  return 'PROVIDER'
}

function personName(user) {
  return user?.full_name || user?.email || user?.phone || ''
}

export function ownerName(item) {
  const named = (item?.owner_name || '').toString().trim()
  if (named) return named
  if (ownerType(item) === 'CUSTOMER') {
    return personName(item?.customer?.user) || 'Unknown customer'
  }
  return (
    personName(item?.provider?.user) ||
    item?.provider?.profile?.full_name ||
    'Unknown provider'
  )
}

/** @deprecated use ownerName */
export function providerName(item) {
  return ownerName(item)
}

export function ownerRoleLabel(item) {
  return ownerType(item) === 'CUSTOMER' ? 'Customer' : 'Provider'
}

export function bankLabel(item) {
  return item?.bankAccount?.bank_name || '—'
}

/** IBANs are long; show enough to identify without dumping the whole thing. */
export function accountLabel(item) {
  const account = item?.bankAccount
  if (!account) return '—'
  if (account.account_number_last4) return `•••• ${account.account_number_last4}`
  if (account.iban) return `${account.iban.slice(0, 4)} •••• ${account.iban.slice(-4)}`
  return '—'
}

export function statusTone(status) {
  switch (status) {
    case 'APPROVED':
    case 'PAID':
      return 'success'
    case 'REJECTED':
    case 'CANCELLED':
      return 'danger'
    default:
      return 'pending'
  }
}
