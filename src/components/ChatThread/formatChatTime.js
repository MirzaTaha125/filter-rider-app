/**
 * Timestamp helpers for the chat thread. Kept out of ChatThread.jsx so that
 * file only exports its component — mixing the two breaks React Fast Refresh.
 */

/** Clock time for a bubble: "14:05". Falls back to date + time off today. */
export function formatChatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const sameDay = date.toDateString() === new Date().toDateString()
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleString([], {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
}

/** Just the clock, with no date — for bubbles that already sit under a day divider. */
export function formatClock(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Label for the divider that separates one day of messages from the next:
 * "Today", "Yesterday", then a written date.
 */
export function formatDayLabel(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.round(
    (startOfDay(new Date()) - startOfDay(date)) / 86400000,
  )

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return date.toLocaleDateString([], { weekday: 'long' })
  return date.toLocaleDateString([], {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/** True when two timestamps fall on different calendar days. */
export function isNewDay(prev, next) {
  if (!prev) return true
  const a = new Date(prev)
  const b = new Date(next)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false
  return a.toDateString() !== b.toDateString()
}
