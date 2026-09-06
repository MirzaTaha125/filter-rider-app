import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Horizontal scroll frame for a `dt-table`, with a matching bar above it.
 *
 * A wide table's only scrollbar sits under the last row, which on a full page
 * of rows is off-screen — you cannot tell there are more columns, let alone
 * reach them. This mirrors the bar at the top of the table where the headers
 * are, and keeps the two in step.
 *
 * The top bar only appears when the table genuinely overflows, so a table that
 * fits is not given a stray empty strip.
 */
function TableScroll({ children, className = '', style }) {
  const topRef = useRef(null)
  const bodyRef = useRef(null)
  // Guards the two scroll handlers against echoing each other forever.
  const syncingRef = useRef(false)

  const [scrollWidth, setScrollWidth] = useState(0)
  const [overflows, setOverflows] = useState(false)

  const measure = useCallback(() => {
    const body = bodyRef.current
    if (!body) return
    setScrollWidth(body.scrollWidth)
    // A pixel of slack: sub-pixel layout rounding otherwise reports a
    // permanent one-pixel overflow on tables that actually fit.
    setOverflows(body.scrollWidth - body.clientWidth > 1)
  }, [])

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return

    measure()

    // Columns change as data loads, and the frame itself changes with the
    // window and the sidebar, so watch both. ResizeObserver is missing in
    // jsdom and in older browsers, where a window listener still covers the
    // case that matters most — the viewport changing width.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(body)
    const table = body.querySelector('table')
    if (table) observer.observe(table)

    return () => observer.disconnect()
  }, [measure, children])

  const sync = (from, to) => {
    if (syncingRef.current) return
    syncingRef.current = true
    if (to && to.scrollLeft !== from.scrollLeft) to.scrollLeft = from.scrollLeft
    // Released on the next frame rather than immediately: the assignment above
    // fires the other element's scroll event asynchronously.
    requestAnimationFrame(() => { syncingRef.current = false })
  }

  return (
    <>
      {overflows && (
        <div
          className="dt-scroll-top"
          ref={topRef}
          onScroll={() => sync(topRef.current, bodyRef.current)}
          // The bar is a duplicate control, not content: screen readers and
          // the keyboard use the table's own scroll frame below.
          aria-hidden="true"
        >
          <div style={{ width: scrollWidth, height: 1 }} />
        </div>
      )}
      <div
        className={`dt-table-wrap ${className}`.trim()}
        style={style}
        ref={bodyRef}
        onScroll={() => sync(bodyRef.current, topRef.current)}
      >
        {children}
      </div>
    </>
  )
}

export default TableScroll
