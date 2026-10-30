import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X, Package, Wrench, Store, RefreshCw, Info, CheckCircle2, XCircle, FolderTree } from 'lucide-react'
import { useSocket } from '../../../contexts/SocketContext'
import {
  getMasterCatalogSummary,
  getMasterCatalogItems,
  getMasterCatalogItem,
  getMasterCatalogWorkshops,
  getMasterCatalogCategories,
} from '../../../api'
import Pager from '../../../components/DataTable/Pager'
import { usePagedRows } from '../../../components/DataTable/usePagedRows'
import TableScroll from '../../../components/DataTable/TableScroll'
import './MasterCatalog.css'
import { ListRowsShimmer, TableBlockShimmer, TableShimmer } from '../../../components/Shimmer/Shimmer'


function catalogTabCount(id, summary) {
  if (id === 'products') return (summary.products?.active ?? 0) + (summary.products?.inactive ?? 0)
  if (id === 'services') return (summary.services?.active ?? 0) + (summary.services?.inactive ?? 0)
  if (id === 'categories') return summary.departments?.length ?? 0
  if (id === 'workshops') return summary.workshops ?? 0
  return 0
}

const TABS = [
  { id: 'products', label: 'Products', kind: 'PRODUCT', Icon: Package },
  { id: 'services', label: 'Services', kind: 'SERVICE', Icon: Wrench },
  { id: 'categories', label: 'Categories', Icon: FolderTree },
  { id: 'workshops', label: 'Workshops & branches', Icon: Store },
]

/** Sent by the Rider backend right after ERP catalog changes were copied (catalog socket). */
const ERP_CATALOG_UPDATED = 'erp.catalog.updated'

const money = (n) =>
  n === null || n === undefined
    ? '—'
    : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const when = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

function Price({ value }) {
  if (value === null || value === undefined) return <span className="dt-muted">—</span>
  return <><span className="riyal-symbol">&#x20C1;</span>{money(value)}</>
}

/**
 * Master Catalog: the ERP (Filter) products, services and branches as copied
 * into Rider for workshop orders. Read-only here — edit in the ERP and the
 * sync brings the change over within about a minute.
 */
function MasterCatalog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.find(t => t.id === searchParams.get('tab')) ?? TABS[0]
  const [summary, setSummary] = useState(null)
  // Bumped when the ERP catalog changes; the open list, item and workshops refetch quietly.
  const [version, setVersion] = useState(0)
  const [liveAt, setLiveAt] = useState(null)
  const { catalogSocket, connected } = useSocket()

  const loadSummary = useCallback(() => {
    getMasterCatalogSummary().then(setSummary).catch(() => setSummary(null))
  }, [])
  useEffect(() => { loadSummary() }, [loadSummary])

  useEffect(() => {
    if (!catalogSocket) return
    const onUpdated = () => {
      setVersion(v => v + 1)
      setLiveAt(new Date())
      loadSummary()
    }
    catalogSocket.on(ERP_CATALOG_UPDATED, onUpdated)
    return () => catalogSocket.off(ERP_CATALOG_UPDATED, onUpdated)
  }, [catalogSocket, loadSummary])

  const switchTab = (id) => setSearchParams(id === 'products' ? {} : { tab: id }, { replace: true })

  return (
    <div className="dt-page-layout">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">
            Products and services from the ERP, with each branch&apos;s price. Customers order these in the Rider app.
          </p>
        </div>
      </header>

      <div className="mc-banner">
        <Info size={16} />
        <span>
          Read-only: this catalog is managed in the ERP. Any change saved there (name, price, on/off, new or
          removed items) appears here by itself within seconds — no reload needed
          {summary?.last_synced_at ? ` · last synced ${when(summary.last_synced_at)}` : ''}.
        </span>
        <span className={`mc-live ${connected?.catalog ? 'is-on' : ''}`} title={connected?.catalog ? 'Live updates on' : 'Live updates reconnecting'}>
          <span className="mc-live-dot" />
          {connected?.catalog ? 'Live' : 'Offline'}
          {liveAt && ` · updated ${liveAt.toLocaleTimeString()}`}
        </span>
        <button className="dt-btn" onClick={() => { setVersion(v => v + 1); loadSummary() }} title="Reload now"><RefreshCw size={14} /></button>
      </div>

      {summary && (
        <div className="mc-stats">
          <div className="mc-stat"><strong>{summary.products.active}</strong><span>Active products</span>{summary.products.inactive > 0 && <em>{summary.products.inactive} inactive</em>}</div>
          <div className="mc-stat"><strong>{summary.services.active}</strong><span>Active services</span>{summary.services.inactive > 0 && <em>{summary.services.inactive} inactive</em>}</div>
          <div className="mc-stat"><strong>{summary.workshops}</strong><span>Workshops</span></div>
          <div className="mc-stat"><strong>{summary.branches}</strong><span>Active branches</span></div>
        </div>
      )}

      <nav className="mc-tabs" role="tablist">
        {TABS.map((t) => {
          const TabIcon = t.Icon
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab.id === t.id}
              className={`mc-tab ${tab.id === t.id ? 'is-active' : ''}`}
              onClick={() => switchTab(t.id)}
            >
              <TabIcon size={16} /> {t.label}
              {summary && <span className="tab-count">{catalogTabCount(t.id, summary)}</span>}
            </button>
          )
        })}
      </nav>

      {tab.id === 'workshops'
        ? <WorkshopsTab version={version} />
        : tab.id === 'categories'
          ? <CategoriesTab departments={summary?.departments ?? []} version={version} />
          : <ItemsTab key={tab.kind} kind={tab.kind} unit={tab.label.toLowerCase()} departments={summary?.departments ?? []} version={version} />}
    </div>
  )
}

function ItemsTab({ kind, unit, departments, version }) {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  // Each result remembers which request it answers; until the current one arrives, the table shows loading.
  const [result, setResult] = useState({ key: null, items: [], total: 0, error: '' })
  const [openId, setOpenId] = useState(null)
  const requestKey = JSON.stringify([kind, query, departmentId, status, page, limit])
  const loading = result.key !== requestKey
  const data = loading ? { items: [], total: result.total } : result
  const error = loading ? '' : result.error

  // Search after the user stops typing.
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let alive = true
    getMasterCatalogItems({ kind, q: query, department_id: departmentId, status, limit, offset: (page - 1) * limit })
      .then(d => { if (alive) setResult({ key: requestKey, items: d?.items ?? [], total: d?.total ?? 0, error: '' }) })
      .catch(e => { if (alive) setResult({ key: requestKey, items: [], total: 0, error: e.message || 'Failed to load the catalog' }) })
    return () => { alive = false }
    // `version` refetches the same view after an ERP change; the rows stay on screen meanwhile.
  }, [requestKey, kind, query, departmentId, status, page, limit, version])

  return (
    <div className="dt-card">
      <div className="dt-toolbar">
        <div className="dt-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by name, Arabic name, SKU or brand…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="dt-toolbar-actions">
          <div className="dt-field">
            <select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1) }} aria-label="Department">
              <option value="">All departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}{d.is_active ? '' : ' (inactive)'}</option>
              ))}
            </select>
          </div>
          <div className="dt-field">
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} aria-label="Status">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <TableScroll>
        <table className="dt-table" style={{ minWidth: 820 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Department</th>
              <th>Price (incl. VAT)</th>
              <th>Before VAT</th>
              <th>Shown at branches</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableShimmer columns={6} />
            ) : error ? (
              <tr><td colSpan="6" className="dt-state dt-state--error">{error}</td></tr>
            ) : data.items.length === 0 ? (
              <tr><td colSpan="6" className="dt-state">No {unit} match this view.</td></tr>
            ) : data.items.map(item => (
              <tr key={item.id} className="is-clickable" onClick={() => setOpenId(item.id)}>
                <td>
                  <div className="dt-cell-stack">
                    <strong>{item.name}</strong>
                    <em>
                      {[item.name_ar, item.sku, item.brand_name].filter(Boolean).join(' · ') || `ERP #${item.erp_id}`}
                    </em>
                  </div>
                </td>
                <td>
                  <div className="dt-cell-stack">
                    <strong>{item.department?.name ?? '—'}</strong>
                    {item.category && <em>{item.category}</em>}
                  </div>
                </td>
                <td><strong><Price value={item.price} /></strong></td>
                <td className="dt-muted"><Price value={item.price_before_vat} /></td>
                <td>{item.branches_count > 0 ? item.branches_count : <span className="dt-muted">0</span>}</td>
                <td>
                  <div className="dt-cell-stack">
                    <span className={`dt-status dt-status--${item.is_active ? 'success' : 'neutral'}`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {item.rider_service_id && <em>Added to Rider services</em>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>

      <Pager
        page={page}
        total={data.total}
        limit={limit}
        onChange={setPage}
        onLimitChange={(n) => { setLimit(n); setPage(1) }}
        unit={unit}
        disabled={loading}
        centered
      />

      {openId && <ItemDrawer id={openId} version={version} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function ItemDrawer({ id, version, onClose }) {
  const [loaded, setLoaded] = useState({ id: null, item: null, error: '' })
  const item = loaded.id === id ? loaded.item : null
  const error = loaded.id === id ? loaded.error : ''

  useEffect(() => {
    let alive = true
    getMasterCatalogItem(id)
      .then(d => { if (alive) setLoaded({ id, item: d, error: '' }) })
      .catch(e => { if (alive) setLoaded({ id, item: null, error: e.message || 'Failed to load the item' }) })
    return () => { alive = false }
  }, [id, version])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="mc-drawer-backdrop" onClick={onClose}>
      <aside className="mc-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Catalog item">
        <header className="mc-drawer-head">
          <div>
            <h2>{item?.name ?? (error ? 'Catalog item' : <span className="shimmer shimmer-line shimmer-line--title" />)}</h2>
            {item?.name_ar && <p className="mc-ar">{item.name_ar}</p>}
          </div>
          <button className="dt-icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>

        {error && <p className="dt-state dt-state--error">{error}</p>}
        {!item && !error && <ListRowsShimmer rows={5} />}

        {item && (
          <>
            <dl className="mc-facts">
              <div><dt>Type</dt><dd>{item.kind === 'PRODUCT' ? 'Product' : 'Service'}</dd></div>
              <div><dt>Status</dt><dd>{item.is_active ? 'Active in the ERP' : 'Inactive in the ERP'}</dd></div>
              <div><dt>Department</dt><dd>{item.department?.name ?? '—'}{item.category ? ` · ${item.category}` : ''}</dd></div>
              <div><dt>Catalog price</dt><dd><Price value={item.price} /> incl. VAT</dd></div>
              {item.price_before_vat !== null && <div><dt>Before VAT</dt><dd><Price value={item.price_before_vat} /></dd></div>}
              {item.sku && <div><dt>SKU</dt><dd>{item.sku}</dd></div>}
              {item.brand_name && <div><dt>Brand</dt><dd>{item.brand_name}</dd></div>}
              {item.unit && <div><dt>Unit</dt><dd>{item.unit}{item.allow_decimal_qty ? ' (decimals allowed)' : ''}</dd></div>}
              {item.vat_mode && <div><dt>VAT mode</dt><dd>{item.vat_mode}</dd></div>}
              <div><dt>ERP id</dt><dd>#{item.erp_id}</dd></div>
              <div><dt>Updated in ERP</dt><dd>{when(item.erp_updated_at)}</dd></div>
            </dl>
            {item.description && <p className="mc-desc">{item.description}</p>}

            <h3 className="mc-subhead">Branches ({item.branches.length}) · shown in the app at {item.branches_count}</h3>
            {item.branches.length === 0 ? (
              <p className="dt-muted">No branch sells this item.</p>
            ) : (
              <ul className="mc-branches">
                {item.branches.map((b, i) => (
                  <li key={i} className={b.shown_in_app ? '' : 'is-off'}>
                    <span className="mc-branch-icon">
                      {b.shown_in_app ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </span>
                    <div className="mc-branch-main">
                      <strong>{b.branch_name ?? 'Unknown branch'}</strong>
                      <em>{b.workshop_name ?? ''}</em>
                      {!b.shown_in_app && <small>{b.not_shown_because.join(' · ')}</small>}
                    </div>
                    <div className="mc-branch-price">
                      <strong><Price value={b.price} /></strong>
                      {b.price_override !== null && <em>branch price</em>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </aside>
    </div>
  )
}

/** ERP categories with their department and how many products / services use each. */
function CategoriesTab({ departments, version }) {
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('all')
  const [result, setResult] = useState({ key: null, items: [], error: '' })
  const requestKey = JSON.stringify([type, status])
  const loading = result.key !== requestKey

  useEffect(() => {
    let alive = true
    getMasterCatalogCategories({ type, status })
      .then(d => { if (alive) setResult({ key: requestKey, items: Array.isArray(d) ? d : [], error: '' }) })
      .catch(e => { if (alive) setResult({ key: requestKey, items: [], error: e.message || 'Failed to load categories' }) })
    return () => { alive = false }
    // `version` refetches after an ERP change; the rows stay on screen meanwhile.
  }, [requestKey, type, status, version])

  const term = search.trim().toLowerCase()
  const visible = result.items.filter(c =>
    (!departmentId || c.department?.id === departmentId)
    && (!term || c.name.toLowerCase().includes(term) || (c.department?.name ?? '').toLowerCase().includes(term)),
  )
  const { pageRows, pagerProps } = usePagedRows(visible, {
    defaultLimit: 20,
    resetKey: `${term}|${departmentId}|${type}|${status}`,
  })
  const showLoading = loading && result.items.length === 0

  return (
    <div className="dt-card">
      <div className="dt-toolbar">
        <div className="dt-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by category or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="dt-toolbar-actions">
          <div className="dt-field">
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} aria-label="Department">
              <option value="">All departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}{d.is_active ? '' : ' (inactive)'}</option>
              ))}
            </select>
          </div>
          <div className="dt-field">
            <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
              <option value="">All types</option>
              <option value="service">Service</option>
              <option value="product">Product</option>
            </select>
          </div>
          <div className="dt-field">
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <TableScroll>
        <table className="dt-table" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Type</th>
              <th>Department</th>
              <th>Products</th>
              <th>Services</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {showLoading ? (
              <TableShimmer columns={6} />
            ) : result.error && !loading ? (
              <tr><td colSpan="6" className="dt-state dt-state--error">{result.error}</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan="6" className="dt-state">No categories match this view.</td></tr>
            ) : pageRows.map(c => (
              <tr key={c.id}>
                <td>
                  <div className="dt-cell-stack">
                    <strong>{c.name}</strong>
                    <em>{c.rider_category_id ? 'Added to Rider categories' : `ERP #${c.erp_id}`}</em>
                  </div>
                </td>
                <td style={{ textTransform: 'capitalize' }}>{c.type || '—'}</td>
                <td>{c.department?.name ?? '—'}</td>
                <td>{c.products > 0 ? c.products : <span className="dt-muted">0</span>}</td>
                <td>{c.services > 0 ? c.services : <span className="dt-muted">0</span>}</td>
                <td>
                  <span className={`dt-status dt-status--${c.is_active ? 'success' : 'neutral'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>

      {visible.length > 0 && <Pager {...pagerProps} unit="categories" disabled={loading} centered />}
    </div>
  )
}

function WorkshopsTab({ version }) {
  const [workshops, setWorkshops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getMasterCatalogWorkshops()
      .then(d => { if (alive) { setWorkshops(Array.isArray(d) ? d : []); setError('') } })
      .catch(e => { if (alive) setError(e.message || 'Failed to load workshops') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [version])

  if (loading) return <TableBlockShimmer columns={4} />
  if (error) return <div className="dt-card"><p className="dt-state dt-state--error">{error}</p></div>
  if (workshops.length === 0) return <div className="dt-card"><p className="dt-state">No workshops synced from the ERP yet.</p></div>

  return (
    <div className="mc-workshops">
      {workshops.map(w => (
        <section key={w.id} className="dt-card mc-workshop">
          <header className="mc-workshop-head">
            <div>
              <h3>{w.name}</h3>
              <p className="dt-muted">{[w.code, w.phone].filter(Boolean).join(' · ') || ' '}</p>
            </div>
            <span className={`dt-status dt-status--${w.is_platform_hq ? 'info' : w.is_active ? 'success' : 'neutral'}`}>
              {w.is_platform_hq ? 'Platform HQ · not in app' : w.is_active ? 'Approved' : 'Not approved'}
            </span>
          </header>
          {w.branches.length === 0 ? (
            <p className="dt-muted mc-pad">No branches.</p>
          ) : (
            <TableScroll>
              <table className="dt-table" style={{ minWidth: 560 }}>
                <thead>
                  <tr><th>Branch</th><th>Products</th><th>Services</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {w.branches.map(b => (
                    <tr key={b.id}>
                      <td>
                        <div className="dt-cell-stack">
                          <strong>{b.name}</strong>
                          {(b.address || b.phone) && <em>{[b.address, b.phone].filter(Boolean).join(' · ')}</em>}
                        </div>
                      </td>
                      <td>{b.products}</td>
                      <td>{b.services}</td>
                      <td>
                        <span className={`dt-status dt-status--${b.is_active ? 'success' : 'neutral'}`}>
                          {b.is_active ? 'Active' : 'Inactive / not approved'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </section>
      ))}
    </div>
  )
}

export default MasterCatalog
