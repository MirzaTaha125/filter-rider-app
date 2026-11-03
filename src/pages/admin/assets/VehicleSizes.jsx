import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Car, AlertTriangle, Search,
} from 'lucide-react'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import { getVehicleSizes, deleteVehicleSize, setVehicleSizeStatus } from '../../../api'
import { usePermissions } from '../../../contexts/PermissionsContext'
import './VehicleSizes.css'
import SortableTh from '../../../components/DataTable/SortableTh'
import { useTableSort } from '../../../components/DataTable/useTableSort'
import TableScroll from '../../../components/DataTable/TableScroll'
import Pager from '../../../components/DataTable/Pager'
import { usePagedRows } from '../../../components/DataTable/usePagedRows'
import { TableBlockShimmer } from '../../../components/Shimmer/Shimmer'

const BASE = '/admin/assets/vehicle-sizes'

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function VehicleSizes() {
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const canCreate = hasPermission('vehicle_sizes.create')
  const canEdit = hasPermission('vehicle_sizes.edit')
  const canDelete = hasPermission('vehicle_sizes.delete')

  const [sizes, setSizes] = useState([])
  const sort = useTableSort()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  const loadData = useCallback(async () => {
    setError('')
    try {
      setSizes(toArray(await getVehicleSizes()))
    } catch (err) {
      setError(err.message || 'Failed to load vehicle sizes')
      setSizes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleDelete = async (size) => {
    const previous = sizes
    setSizes(list => list.filter(s => s.id !== size.id))
    try {
      await deleteVehicleSize(size.id)
    } catch (err) {
      setSizes(previous)
      setError(err.message || 'Failed to delete vehicle size')
    }
  }

  const handleToggle = async (size) => {
    const next = !size.is_active
    setTogglingId(size.id)
    setSizes(list => list.map(s => (s.id === size.id ? { ...s, is_active: next } : s)))
    try {
      await setVehicleSizeStatus(size.id, next)
    } catch (err) {
      setSizes(list => list.map(s => (s.id === size.id ? { ...s, is_active: !next } : s)))
      setError(err.message || 'Failed to change status')
    } finally {
      setTogglingId(null)
    }
  }

  const term = search.trim().toLowerCase()
  const visibleSizes = sizes.filter(size =>
    !term
    || (size.name || '').toLowerCase().includes(term)
    || (size.code || '').toLowerCase().includes(term),
  )

  const sortedSizes = sort.apply(visibleSizes, {
    name: (s) => s.name,
    code: (s) => s.code,
    display_order: (s) => Number(s.display_order ?? 0),
    status: (s) => (s.is_active ? 0 : 1),
  })
  const { pageRows, pagerProps } = usePagedRows(sortedSizes, {
    defaultLimit: 20,
    resetKey: term,
  })

  const activeCount = sizes.filter(s => s.is_active).length

  return (
    <div className="vehicle-sizes">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">The master list of vehicle sizes, in the order customers see them.</p>
        </div>
        {canCreate && (
          <button className="dt-btn dt-btn--primary" onClick={() => navigate(`${BASE}/add`)}>
            <Plus size={18} />
            Add New Size
          </button>
        )}
      </header>

      <div className="dt-toolbar">
        <div className="dt-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="vs-count">
          {loading ? '—' : `${sizes.length} size${sizes.length === 1 ? '' : 's'} · ${activeCount} active`}
        </span>
      </div>

      {error && (
        <div className="vs-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {loading ? (
        <TableBlockShimmer columns={5} />
      ) : sizes.length === 0 ? (
        <div className="dt-empty">
          <Car size={32} />
          <h2>No vehicle sizes yet</h2>
          <p>Add sizes such as Small, Medium and Large to build the master list.</p>
          {canCreate && (
            <button className="dt-btn dt-btn--primary" onClick={() => navigate(`${BASE}/add`)}>
              <Plus size={16} /> Add New Size
            </button>
          )}
        </div>
      ) : visibleSizes.length === 0 ? (
        <div className="dt-empty">
          <Search size={32} />
          <h2>No matches</h2>
          <p>No vehicle sizes match “{search.trim()}”.</p>
        </div>
      ) : (
        <div className="dt-card">
          <TableScroll>
            <table className="dt-table">
              <thead>
                <tr>
                  <SortableTh sortKey="name" sort={sort}>Name</SortableTh>
                  <SortableTh sortKey="code" sort={sort}>Code</SortableTh>
                  <SortableTh sortKey="display_order" sort={sort}>Display Order</SortableTh>
                  <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(size => (
                  <tr key={size.id}>
                    <td>
                      <span className="vs-cell-name">
                        <Car size={15} />
                        <span>
                          {size.name}
                          {size.name_ar && <span className="vs-name-ar" dir="rtl" lang="ar">{size.name_ar}</span>}
                        </span>
                      </span>
                    </td>
                    <td><code className="vs-code">{size.code}</code></td>
                    <td className="vs-cell-order">{size.display_order}</td>
                    <td>
                      {canEdit ? (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={Boolean(size.is_active)}
                          className={`vs-switch ${size.is_active ? 'is-on' : ''}`}
                          onClick={() => handleToggle(size)}
                          disabled={togglingId === size.id}
                          title={size.is_active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <span className="vs-switch-track"><span className="vs-switch-thumb" /></span>
                          <span className="vs-switch-label">{size.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      ) : (
                        <span className={`dt-status ${size.is_active ? 'dt-status--success' : 'dt-status--muted'}`}>
                          {size.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="dt-row-actions">
                        {canEdit && (
                          <button
                            className="dt-icon-btn"
                            onClick={() => navigate(`${BASE}/${size.id}/edit`)}
                            title={`Edit ${size.name}`}
                            aria-label={`Edit ${size.name}`}
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="dt-icon-btn dt-icon-btn--danger"
                            onClick={() => setConfirm(size)}
                            title={`Delete ${size.name}`}
                            aria-label={`Delete ${size.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                        {!canEdit && !canDelete && <span className="dt-muted">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <Pager {...pagerProps} unit="sizes" />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete vehicle size"
        message={confirm ? `Delete "${confirm.name}" (${confirm.code})? A size linked to a vehicle type can't be deleted. To hide it, set it to Inactive instead.` : ''}
        confirmLabel="Delete size"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const pending = confirm
          setConfirm(null)
          if (pending) handleDelete(pending)
        }}
      />
    </div>
  )
}

export default VehicleSizes
