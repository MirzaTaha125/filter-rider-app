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

export function providerName(item) {
  const user = item?.provider?.user
  return user?.full_name || user?.email || user?.phone || 'Unknown provider'
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
