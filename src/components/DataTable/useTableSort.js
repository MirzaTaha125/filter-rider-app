import { useState, useMemo, useCallback } from 'react'

/**
 * Click-to-sort for a `dt-table`.
 *
 * Columns declare how to read their value rather than sorting themselves, so a
 * cell that renders a badge or a formatted amount still sorts on the underlying
 * number or date:
 *
 *   const sort = useTableSort('created_at', 'desc')
 *   const rows = sort.apply(items, {
 *     order_no: (row) => row.order_no,
 *     total:    (row) => Number(row.total),
 *     created_at: (row) => new Date(row.created_at).getTime(),
 *   })
 *
 * A column with no accessor is not sortable. Sorting runs over the rows handed
 * to it — on a server-paginated list that is the current page.
 */
export function useTableSort(defaultKey = null, defaultDir = 'asc') {
  // Key and direction are one piece of state on purpose. They used to be two,
  // with the direction flipped from inside the key's updater — an impure
  // updater, which StrictMode double-invokes: the direction flipped twice per
  // click and the column looked stuck in one order.
  const [{ key: sortKey, dir: sortDir }, setSort] = useState({
    key: defaultKey,
    dir: defaultDir,
  })

  // First click on a column sorts ascending; clicking the active column flips
  // it. Pure, so running it twice lands in the same place as running it once.
  const toggle = useCallback((key) => {
    setSort((prev) => (
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    ))
  }, [])

  const apply = useCallback((rows, accessors) => {
    const read = accessors?.[sortKey]
    if (!read || !Array.isArray(rows)) return rows ?? []

    const factor = sortDir === 'desc' ? -1 : 1
    // Slice first: sorting the caller's array in place would mutate state.
    return rows.slice().sort((a, b) => {
      const left = read(a)
      const right = read(b)

      // Rows with nothing in the column sink to the bottom either way — a
      // column of blanks at the top is never what someone wanted to see.
      const leftEmpty = isBlank(left)
      const rightEmpty = isBlank(right)
      if (leftEmpty || rightEmpty) {
        if (leftEmpty && rightEmpty) return 0
        return leftEmpty ? 1 : -1
      }

      return compare(left, right) * factor
    })
  }, [sortKey, sortDir])

  return useMemo(
    () => ({ sortKey, sortDir, toggle, apply }),
    [sortKey, sortDir, toggle, apply],
  )
}

function isBlank(value) {
  return value === null || value === undefined || value === ''
}

/** Numbers compare numerically, text naturally and case-insensitively. */
function compare(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return (a ? 1 : 0) - (b ? 1 : 0)

  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}
