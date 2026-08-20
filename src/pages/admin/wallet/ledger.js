/** Field helpers for wallet ledger transactions. */

/** WalletTransactionType — must match the Prisma enum the API filters on. */
export const LEDGER_TYPES = [
  'TOPUP',
  'EARNING',
  'ORDER_PAYMENT',
  'TIP',
  'WITHDRAWAL_REQUEST',
  'WITHDRAWAL_APPROVED',
  'WITHDRAWAL_REJECTED',
  'REFUND',
  'ADJUSTMENT',
  'REVERSAL',
]

export function typeLabel(type) {
  if (!type) return '—'
  return type
    .toLowerCase()
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * A transaction has no owner of its own — it belongs to a wallet, which in turn
 * belongs to either a customer or a provider.
 */
export function counterparty(txn) {
  const wallet = txn?.wallet
  if (!wallet) return { name: '—', role: '' }

  const owner = wallet.owner_type === 'PROVIDER' ? wallet.provider : wallet.customer
  const user = owner?.user
  return {
    name: user?.full_name || user?.email || '—',
    role: wallet.owner_type ? wallet.owner_type.charAt(0) + wallet.owner_type.slice(1).toLowerCase() : '',
  }
}

/** What this transaction points at — an order, a withdrawal, or a top-up. */
export function referenceLabel(txn) {
  if (txn?.order?.order_no) return { label: txn.order.order_no, kind: 'Order' }
  if (txn?.withdrawalRequest?.request_no) return { label: txn.withdrawalRequest.request_no, kind: 'Withdrawal' }
  if (txn?.topup?.topup_no) return { label: txn.topup.topup_no, kind: 'Top-up' }
  return null
}

export function isCredit(txn) {
  return txn?.direction === 'CREDIT'
}

export function transactionStatusTone(status) {
  switch (status) {
    case 'POSTED':
      return 'success'
    case 'FAILED':
    case 'CANCELLED':
    case 'REVERSED':
      return 'danger'
    default:
      return 'pending'
  }
}
