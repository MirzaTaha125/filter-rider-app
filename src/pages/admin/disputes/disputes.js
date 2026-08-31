/** Shared helpers for the dispute screens. */

export const DISPUTE_STATUSES = ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED']

export const STATUS_LABELS = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under review',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
}

export const DISPUTE_TYPES = [
  'SERVICE_QUALITY',
  'PAYMENT_ISSUE',
  'LATE_ARRIVAL',
  'INCOMPLETE_WORK',
  'DAMAGE',
  'OTHER',
]

export function enumLabel(value) {
  if (!value) return '—'
  return value
    .toLowerCase()
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function statusTone(status) {
  switch (status) {
    case 'RESOLVED':
      return 'success'
    case 'REJECTED':
      return 'danger'
    case 'UNDER_REVIEW':
      return 'info'
    default:
      return 'pending'
  }
}

export function partyName(party) {
  return party?.user?.full_name || party?.user?.email || '—'
}

export function formatDate(value, withTime = false) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return withTime
    ? d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/** `attachment_urls` is a Json column — tolerate array, single string, or null. */
export function attachments(dispute) {
  const raw = dispute?.attachment_urls
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(u => typeof u === 'string')
  if (typeof raw === 'string') return [raw]
  return []
}
