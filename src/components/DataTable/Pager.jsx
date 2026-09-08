/**
 * Shared list footer: "Showing x – y of n" plus page buttons.
 *
 * Page numbers collapse to first, last, current ±1 with ellipsis for the gaps,
 * so the control stays the same width whether there are 3 pages or 300.
 *
 * Pass `centered` + `onLimitChange` for a three-column footer: count on the
 * left, pager in the middle, rows-per-page on the right.
 */
const DEFAULT_LIMIT_OPTIONS = [10, 20, 50, 100]

function Pager({
  page,
  total,
  limit,
  onChange,
  onLimitChange,
  limitOptions = DEFAULT_LIMIT_OPTIONS,
  unit = 'items',
  disabled = false,
  centered = false,
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1)
  const from = total ? (page - 1) * limit + 1 : 0
  const to = Math.min(page * limit, total)
  const showPager = total > 0 && (totalPages > 1 || centered)

  const buttons = (() => {
    const set = new Set(
      [1, totalPages, page, page - 1, page + 1].filter(p => p >= 1 && p <= totalPages),
    )
    const sorted = [...set].sort((a, b) => a - b)
    const out = []
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) out.push('…')
      out.push(p)
    })
    return out
  })()

  const pager = showPager ? (
    <div className="dt-pager">
      <button
        className="dt-page"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page === 1}
      >
        Prev
      </button>
      {buttons.map((p, i) => (
        p === '…'
          ? <span key={`gap-${i}`} className="dt-page-gap">…</span>
          : (
            <button
              key={p}
              className={`dt-page ${p === page ? 'is-current' : ''}`}
              onClick={() => onChange(p)}
              disabled={disabled}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
      ))}
      <button
        className="dt-page"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page === totalPages}
      >
        Next
      </button>
    </div>
  ) : centered ? <div className="dt-pager" /> : null

  const limitControl = onLimitChange ? (
    <label className="dt-foot-limit">
      <span>Rows</span>
      <select
        value={limit}
        disabled={disabled}
        onChange={(e) => {
          const next = Number(e.target.value)
          onLimitChange(next)
          if (page !== 1) onChange(1)
        }}
      >
        {limitOptions.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </label>
  ) : centered ? <span /> : null

  return (
    <footer className={`dt-foot${centered ? ' dt-foot--centered' : ''}`}>
      <span className="dt-foot-info">
        {total > 0
          ? `Showing ${from} – ${to} of ${total.toLocaleString()}`
          : `No ${unit}`}
      </span>
      {pager}
      {limitControl}
    </footer>
  )
}

export default Pager
