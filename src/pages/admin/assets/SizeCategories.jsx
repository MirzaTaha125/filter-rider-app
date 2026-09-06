import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Ruler, Loader2, AlertTriangle, Search,
} from 'lucide-react'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import { getSizeCategories, deleteSizeCategory } from '../../../api'
import './SizeCategories.css'
import SortableTh from '../../../components/DataTable/SortableTh'
import { useTableSort } from '../../../components/DataTable/useTableSort'
import TableScroll from '../../../components/DataTable/TableScroll'

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function describeMultiplier(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  if (n === 1) return 'Standard price'
  if (n === 0) return 'Free'
  const pct = Number(Math.abs((n - 1) * 100).toFixed(1))
  return n > 1 ? `+${pct}%` : `−${pct}%`
}

function SizeCategories() {
  const navigate = useNavigate()

  const [sizes, setSizes] = useState([])
  const sort = useTableSort()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)

  const loadData = useCallback(async () => {
    setError('')
    try {
      setSizes(toArray(await getSizeCategories()))
    } catch (err) {
      setError(err.message || 'Failed to load size categories')
      setSizes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const askDelete = (size) => {
    setConfirm({
      size,
      message: `Delete "${size.name}"? This is blocked if the size is used by the pricing matrix or by any customer vehicle.`,
    })
  }

  const handleDelete = async (size) => {
    const previous = sizes
    setSizes(list => list.filter(s => s.id !== size.id))
    try {
      await deleteSizeCategory(size.id)
    } catch (err) {
      // The API refuses to delete a size that is still referenced, and explains why.
      setSizes(previous)
      setError(err.message || 'Failed to delete size category')
    }
  }

  const term = search.trim().toLowerCase()
  const visibleSizes = sizes.filter(size =>
    !term || (size.name || '').toLowerCase().includes(term),
  )

  const sortedSizes = sort.apply(visibleSizes, {
    name: (s) => s.name,
    multiplier: (s) => Number(s.multiplier ?? 0),
    effect: (s) => Number(s.multiplier ?? 0),
  })

  return (
    <div className="size-categories">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">Groups assets by size and scales the price accordingly.</p>
        </div>
        <button
          className="dt-btn dt-btn--primary"
          onClick={() => navigate('/admin/assets/sizes/add')}
        >
          <Plus size={18} />
          Add Category
        </button>
      </header>

      <div className="dt-toolbar">
        <div className="dt-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search size categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="sz-count">
          {loading ? '—' : `${sizes.length} categor${sizes.length === 1 ? 'y' : 'ies'}`}
        </span>
      </div>

      {error && (
        <div className="sz-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {loading ? (
        <div className="dt-empty">
          <Loader2 size={32} className="spin" />
          <span>Loading size categories…</span>
        </div>
      ) : sizes.length === 0 ? (
        <div className="dt-empty">
          <Ruler size={32} />
          <h2>No size categories yet</h2>
          <p>Create one to price the same service differently by asset size.</p>
          <button className="dt-btn dt-btn--primary" onClick={() => navigate('/admin/assets/sizes/add')}>
            <Plus size={16} /> Add Category
          </button>
        </div>
      ) : visibleSizes.length === 0 ? (
        <div className="dt-empty">
          <Search size={32} />
          <h2>No matches</h2>
          <p>No size categories match “{search.trim()}”.</p>
        </div>
      ) : (
        <div className="dt-card">
          <TableScroll>
            <table className="dt-table">
              <thead>
                <tr>
                  <SortableTh sortKey="name" sort={sort}>Name</SortableTh>
                  <SortableTh sortKey="multiplier" sort={sort}>Multiplier</SortableTh>
                  <SortableTh sortKey="effect" sort={sort}>Effect on price</SortableTh>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {sortedSizes.map(size => {
                  const n = Number(size.multiplier)
                  return (
                    <tr key={size.id}>
                      <td>
                        <span className="sz-cell-name">
                          <Ruler size={15} />
                          {size.name}
                        </span>
                      </td>
                      <td className="sz-cell-multiplier">{Number(size.multiplier)}×</td>
                      <td>
                        <span className={`sz-effect ${n > 1 ? 'is-up' : n < 1 ? 'is-down' : 'is-flat'}`}>
                          {describeMultiplier(size.multiplier)}
                        </span>
                      </td>
                      <td>
                        <div className="dt-row-actions">
                          <button
                            className="dt-icon-btn"
                            onClick={() => navigate(`/admin/assets/sizes/${size.id}/edit`)}
                            title={`Edit ${size.name}`}
                            aria-label={`Edit ${size.name}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="dt-icon-btn dt-icon-btn--danger"
                            onClick={() => askDelete(size)}
                            title={`Delete ${size.name}`}
                            aria-label={`Delete ${size.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableScroll>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete size category"
        message={confirm?.message}
        confirmLabel="Delete category"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const pending = confirm
          setConfirm(null)
          if (pending) handleDelete(pending.size)
        }}
      />
    </div>
  )
}

export default SizeCategories
