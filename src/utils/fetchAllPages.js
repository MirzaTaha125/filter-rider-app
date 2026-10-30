/**
 * Loads every page of an admin list endpoint (`{ items, meta: { total } }` or
 * a plain array) so the page can sort, filter and paginate the full list.
 * Stops after `maxPages` as a safety net.
 */
export async function fetchAllPages(fetchPage, { pageSize = 100, maxPages = 50 } = {}) {
  const all = []
  for (let page = 1; page <= maxPages; page += 1) {
    const response = await fetchPage({ page, limit: pageSize })
    const rows = Array.isArray(response)
      ? response
      : (response?.items ?? response?.orders ?? response?.customers ?? response?.requests ?? response?.data ?? [])
    all.push(...rows)
    const total = Number(response?.meta?.total ?? response?.total ?? NaN)
    if (rows.length < pageSize || (Number.isFinite(total) && all.length >= total)) break
  }
  return all
}
