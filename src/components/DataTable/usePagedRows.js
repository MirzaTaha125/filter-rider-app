import { useMemo, useState } from 'react'

/** Page of `list` for the given state, plus the props the shared <Pager> needs. */
function slice(list, page, limit, setPage, setLimit) {
  const rows = Array.isArray(list) ? list : []
  const totalPages = Math.max(1, Math.ceil(rows.length / limit))
  // A shorter list (search, delete) keeps the last page that still exists.
  const current = Math.min(page, totalPages)
  return {
    pageRows: rows.slice((current - 1) * limit, current * limit),
    pagerProps: {
      page: current,
      total: rows.length,
      limit,
      onChange: setPage,
      onLimitChange: (n) => {
        setLimit(n)
        setPage(1)
      },
    },
  }
}

/**
 * Page state only, for components that build their list after an early
 * return (loading / error): call the hook first, then `paginate(list)` where
 * the list exists. The page resets to 1 when `resetKey` changes.
 */
export function usePager({ defaultLimit = 20, resetKey } = {}) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(defaultLimit)

  // New search / filter: start from the first page.
  const [lastKey, setLastKey] = useState(resetKey)
  if (resetKey !== lastKey) {
    setLastKey(resetKey)
    setPage(1)
  }

  return {
    paginate: (list) => slice(list, page, limit, setPage, setLimit),
  }
}

/**
 * Client-side paging for lists the page already holds in full (most admin
 * lists load everything at once). Returns the rows of the current page plus
 * the props the shared <Pager> needs. The page resets to 1 when `resetKey`
 * changes (pass the search / filter values).
 */
export function usePagedRows(rows, { defaultLimit = 20, resetKey } = {}) {
  const { paginate } = usePager({ defaultLimit, resetKey })
  const result = paginate(rows)
  // Keep the row array stable between renders when nothing changed.
  const { page, limit } = result.pagerProps
  const pageRows = useMemo(() => result.pageRows, [rows, page, limit]) // eslint-disable-line react-hooks/exhaustive-deps
  return { pageRows, pagerProps: result.pagerProps }
}
