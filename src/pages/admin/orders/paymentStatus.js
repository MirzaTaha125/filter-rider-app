/**
 * Payment state for an order, derived from the flags the API returns.
 *
 * `is_paid` alone is not enough to label a row: an order that does not require
 * payment is not "unpaid", and one that is due only after the service has been
 * delivered should not read as overdue while it is still in progress.
 */
export function getPaymentState(order) {
  if (!order) return { key: 'unknown', label: '—', tone: 'muted' }

  if (order.is_payment_required === false) {
    return { key: 'not-required', label: 'Not required', tone: 'muted' }
  }

  if (order.is_paid) {
    return { key: 'paid', label: 'Paid', tone: 'success' }
  }

  const status = String(order.status ?? '').toUpperCase()

  if (status === 'CANCELLED') {
    return { key: 'cancelled', label: 'Not collected', tone: 'muted' }
  }

  // Due after the job: only overdue once the job is actually finished.
  if (order.payment_timing === 'PAY_AFTER_SERVICE') {
    return status === 'COMPLETED'
      ? { key: 'due', label: 'Payment due', tone: 'danger' }
      : { key: 'pay-after', label: 'Pay after service', tone: 'warning' }
  }

  return { key: 'unpaid', label: 'Unpaid', tone: 'danger' }
}

export const PAYMENT_TIMING_LABELS = {
  PAY_BEFORE_SERVICE: 'Before service',
  PAY_AFTER_SERVICE: 'After service',
}

/** Tone per PaymentStatus enum value, for the payment records table. */
export const PAYMENT_RECORD_TONES = {
  PAID: 'success',
  AUTHORIZED: 'success',
  INITIATED: 'warning',
  PENDING: 'warning',
  REQUIRES_ACTION: 'warning',
  FAILED: 'danger',
  CANCELLED: 'muted',
  REVERSED: 'muted',
  REFUNDED: 'muted',
  PARTIALLY_REFUNDED: 'warning',
}

export function formatMoney(value, currency = 'SAR') {
  const n = Number(value ?? 0)
  const amount = Number.isNaN(n)
    ? '0.00'
    : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return { currency, amount }
}
