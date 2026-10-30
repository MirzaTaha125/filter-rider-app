import { useState, useEffect } from 'react'
import { Search, X, Check, Loader2, Plus, Library } from 'lucide-react'
import {
  getMasterCatalogItems,
  getMasterCatalogCategories,
  importMasterCatalogService,
  importMasterCatalogCategory,
} from '../../../api'
import Pager from '../../../components/DataTable/Pager'
import { usePagedRows } from '../../../components/DataTable/usePagedRows'
import './MasterCatalogPicker.css'
import { ListRowsShimmer } from '../../../components/Shimmer/Shimmer'


const DEFAULT_DURATION = 60

const money = (n) =>
  n === null || n === undefined
    ? '—'
    : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Header button that opens the picker ("Add service / category from master catalog"). */
export function FromMasterCatalogButton({ label, onClick }) {
  return (
    <button type="button" className="mcp-trigger" onClick={onClick}>
      <Library size={17} />
      {label}
    </button>
  )
}

/**
 * Picks ERP master catalog services (mode "service") or categories (mode
 * "category") and adds them to the Rider catalog. A service keeps its ERP
 * name, Arabic name and price; its ERP category comes along unless another
 * Rider category is chosen.
 */
export default function MasterCatalogPicker({ mode, riderCategories = [], onClose, onAdded }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const title = mode === 'service' ? 'Add service from master catalog' : 'Add category from master catalog'
  return (
    <div className="mcp-backdrop" onClick={onClose}>
      <div className="mcp-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="mcp-head">
          <div>
            <h2>{title}</h2>
            <p>
              {mode === 'service'
                ? 'Services from the ERP. The Rider service gets the same name and price, and its category.'
                : 'Categories from the ERP. The Rider category gets the same name.'}
            </p>
          </div>
          <button type="button" className="mcp-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        {mode === 'service'
          ? <ServicePicker riderCategories={riderCategories} onAdded={onAdded} />
          : <CategoryPicker onAdded={onAdded} />}
      </div>
    </div>
  )
}

function useDebounced(value, ms = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

function ServicePicker({ riderCategories, onAdded }) {
  const [search, setSearch] = useState('')
  const query = useDebounced(search.trim())
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState({ key: null, items: [], total: 0, error: '' })
  const [selected, setSelected] = useState(null)
  const requestKey = JSON.stringify([query, page, limit, reload])
  const loading = result.key !== requestKey

  useEffect(() => {
    let alive = true
    getMasterCatalogItems({ kind: 'SERVICE', q: query, status: 'active', limit, offset: (page - 1) * limit })
      .then(d => { if (alive) setResult({ key: requestKey, items: d?.items ?? [], total: d?.total ?? 0, error: '' }) })
      .catch(e => { if (alive) setResult({ key: requestKey, items: [], total: 0, error: e.message || 'Failed to load the master catalog' }) })
    return () => { alive = false }
  }, [requestKey, query, page, limit])

  if (selected) {
    return (
      <ServiceConfirm
        item={selected}
        riderCategories={riderCategories}
        onBack={() => setSelected(null)}
        onDone={(res) => {
          setSelected(null)
          setReload(n => n + 1)
          onAdded?.(res)
        }}
      />
    )
  }

  return (
    <>
      <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search services by name or Arabic name…" />
      <div className="mcp-list" aria-busy={loading}>
        {loading && result.items.length === 0 ? (
          <ListRowsShimmer rows={5} />
        ) : result.error ? (
          <p className="mcp-state mcp-state--error">{result.error}</p>
        ) : result.items.length === 0 ? (
          <p className="mcp-state">No active master catalog services match.</p>
        ) : result.items.map(item => (
          <div key={item.id} className="mcp-row">
            <div className="mcp-row-main">
              <strong>{item.name}</strong>
              <em>
                {[item.name_ar, item.department?.name, item.category].filter(Boolean).join(' · ') || `ERP #${item.erp_id}`}
              </em>
            </div>
            <span className="mcp-price"><span className="riyal-symbol">&#x20C1;</span>{money(item.price)}</span>
            {item.rider_service_id ? (
              <span className="mcp-added"><Check size={14} /> Added</span>
            ) : (
              <button
                type="button"
                className="mcp-add-btn"
                onClick={() => setSelected(item)}
                disabled={!(Number(item.price) > 0)}
                title={Number(item.price) > 0 ? `Add ${item.name}` : 'No price in the master catalog'}
              >
                <Plus size={14} /> Select
              </button>
            )}
          </div>
        ))}
      </div>
      <Pager
        page={page}
        total={result.total}
        limit={limit}
        onChange={setPage}
        onLimitChange={(n) => { setLimit(n); setPage(1) }}
        unit="services"
        disabled={loading}
      />
    </>
  )
}

function ServiceConfirm({ item, riderCategories, onBack, onDone }) {
  // '' = the service's own ERP category (added to Rider categories when new).
  const [categoryId, setCategoryId] = useState('')
  const [duration, setDuration] = useState(String(DEFAULT_DURATION))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const needsCategory = !item.category_id
  const durationNo = Number(duration)
  const durationOk = Number.isInteger(durationNo) && durationNo >= 1 && durationNo <= 1440
  const canSave = !saving && durationOk && (!needsCategory || categoryId)

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await importMasterCatalogService(item.id, {
        ...(categoryId ? { category_id: categoryId } : {}),
        duration_min: durationNo,
      })
      onDone(res)
    } catch (e) {
      setError(e.message || 'Failed to add the service')
      setSaving(false)
    }
  }

  return (
    <div className="mcp-confirm">
      <dl className="mcp-facts">
        <div><dt>Name</dt><dd>{item.name}</dd></div>
        <div><dt>Arabic name</dt><dd dir="rtl">{item.name_ar || item.name}</dd></div>
        <div><dt>Base price</dt><dd><span className="riyal-symbol">&#x20C1;</span>{money(item.price)} <small>(master catalog price, incl. VAT)</small></dd></div>
      </dl>

      <label className="mcp-field">
        <span>Category</span>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {needsCategory
            ? <option value="">Choose a category…</option>
            : <option value="">{item.category} (from master catalog)</option>}
          {riderCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <small>
          {needsCategory
            ? 'This service has no category in the master catalog.'
            : 'Added to Rider categories if it is not there yet.'}
        </small>
      </label>

      <label className="mcp-field">
        <span>Duration (minutes)</span>
        <input type="number" min="1" max="1440" step="1" value={duration} onChange={(e) => setDuration(e.target.value)} />
        {!durationOk && <small className="mcp-error-text">Enter whole minutes (1–1440).</small>}
      </label>

      {error && <p className="mcp-state mcp-state--error">{error}</p>}

      <footer className="mcp-actions">
        <button type="button" className="mcp-btn" onClick={onBack} disabled={saving}>Back</button>
        <button type="button" className="mcp-btn mcp-btn--primary" onClick={save} disabled={!canSave}>
          {saving ? <><Loader2 size={15} className="spin" /> Adding…</> : <><Plus size={15} /> Add service</>}
        </button>
      </footer>
    </div>
  )
}

function CategoryPicker({ onAdded }) {
  const [search, setSearch] = useState('')
  const query = useDebounced(search.trim())
  const [type, setType] = useState('service')
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState({ key: null, items: [], error: '' })
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const requestKey = JSON.stringify([query, type, reload])
  const loading = result.key !== requestKey
  const { pageRows, pagerProps } = usePagedRows(result.items, { defaultLimit: 10, resetKey: `${query}|${type}` })

  useEffect(() => {
    let alive = true
    getMasterCatalogCategories({ q: query, type, status: 'active' })
      .then(d => { if (alive) setResult({ key: requestKey, items: Array.isArray(d) ? d : [], error: '' }) })
      .catch(e => { if (alive) setResult({ key: requestKey, items: [], error: e.message || 'Failed to load the master catalog' }) })
    return () => { alive = false }
  }, [requestKey, query, type])

  const add = async (cat) => {
    setBusyId(cat.id)
    setError('')
    try {
      const res = await importMasterCatalogCategory(cat.id)
      setReload(n => n + 1)
      onAdded?.(res)
    } catch (e) {
      setError(e.message || 'Failed to add the category')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div className="mcp-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search categories or departments…" />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Category type">
          <option value="service">Service categories</option>
          <option value="product">Product categories</option>
          <option value="">All types</option>
        </select>
      </div>
      {error && <p className="mcp-state mcp-state--error">{error}</p>}
      <div className="mcp-list" aria-busy={loading}>
        {loading && result.items.length === 0 ? (
          <ListRowsShimmer rows={5} />
        ) : result.error ? (
          <p className="mcp-state mcp-state--error">{result.error}</p>
        ) : result.items.length === 0 ? (
          <p className="mcp-state">No active master catalog categories match.</p>
        ) : pageRows.map(cat => (
          <div key={cat.id} className="mcp-row">
            <div className="mcp-row-main">
              <strong>{cat.name}</strong>
              <em>
                {[cat.department?.name, `${cat.services} service${cat.services === 1 ? '' : 's'}`, `${cat.products} product${cat.products === 1 ? '' : 's'}`]
                  .filter(Boolean).join(' · ')}
              </em>
            </div>
            {cat.rider_category_id ? (
              <span className="mcp-added"><Check size={14} /> Added</span>
            ) : (
              <button type="button" className="mcp-add-btn" onClick={() => add(cat)} disabled={busyId !== null}>
                {busyId === cat.id ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Add
              </button>
            )}
          </div>
        ))}
      </div>
      {result.items.length > 0 && <Pager {...pagerProps} unit="categories" />}
    </>
  )
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="mcp-search">
      <Search size={16} />
      <input type="search" autoFocus placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
