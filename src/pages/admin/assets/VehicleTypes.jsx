import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Power, CarFront, AlertTriangle, Search,
} from 'lucide-react'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import { getVehicleTypes, setVehicleTypeStatus } from '../../../api'
import { usePermissions } from '../../../contexts/PermissionsContext'
import './VehicleSizes.css'
import SortableTh from '../../../components/DataTable/SortableTh'
import { useTableSort } from '../../../components/DataTable/useTableSort'
import TableScroll from '../../../components/DataTable/TableScroll'
import Pager from '../../../components/DataTable/Pager'
import { usePagedRows } from '../../../components/DataTable/usePagedRows'
import { TableBlockShimmer } from '../../../components/Shimmer/Shimmer'

const BASE = '/admin/assets/vehicle-types'

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function VehicleTypes() {
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const canCreate = hasPermission('vehicle_types.create')
  const canEdit = hasPermission('vehicle_types.edit')

  const [types, setTypes] = useState([])
  const sort = useTableSort()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const loadData = useCallback(async () => {
    setError('')
    try {
      setTypes(toArray(await getVehicleTypes()))
    } catch (err) {
      setError(err.message || 'Failed to load vehicle types')
      setTypes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const setStatus = async (type, isActive) => {
    setBusyId(type.id)
    try {
      await setVehicleTypeStatus(type.id, isActive)
      setTypes(list => list.map(t => (t.id === type.id ? { ...t, is_active: isActive } : t)))
    } catch (err) {
      setError(err.message || 'Failed to change status')
    } finally {
      setBusyId(null)
    }
  }

  // Deactivating hides the type from customers, so it asks first; activating doesn't.
  const handleStatusClick = (type) => {
    if (type.is_active) setConfirm(type)
    else setStatus(type, true)
  }

  const term = search.trim().toLowerCase()
  const visibleTypes = types.filter(type =>
    !term
    || (type.name || '').toLowerCase().includes(term)
    || (type.vehicle_size?.name || '').toLowerCase().includes(term),
  )

  const sortedTypes = sort.apply(visibleTypes, {
    name: (t) => t.name,
    size: (t) => t.vehicle_size?.name ?? '',
    display_order: (t) => Number(t.display_order ?? 0),
    status: (t) => (t.is_active ? 0 : 1),
  })
  const { pageRows, pagerProps } = usePagedRows(sortedTypes, {
    defaultLimit: 20,
    resetKey: term,
  })

  const activeCount = types.filter(t => t.is_active).length

  return (
    <div className="vehicle-sizes">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">Maps each vehicle type to one size from the Vehicle Size Master.</p>
        </div>
        {canCreate && (
          <button className="dt-btn dt-btn--primary" onClick={() => navigate(`${BASE}/add`)}>
            <Plus size={18} />
            Add Vehicle Type
          </button>
        )}
      </header>

      <div className="dt-toolbar">
        <div className="dt-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by vehicle type or size…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="vs-count">
          {loading ? '—' : `${types.length} type${types.length === 1 ? '' : 's'} · ${activeCount} active`}
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
      ) : types.length === 0 ? (
        <div className="dt-empty">
          <CarFront size={32} />
          <h2>No vehicle types yet</h2>
          <p>Add types such as Sedan or SUV and link each one to a size.</p>
          {canCreate && (
            <button className="dt-btn dt-btn--primary" onClick={() => navigate(`${BASE}/add`)}>
              <Plus size={16} /> Add Vehicle Type
            </button>
          )}
        </div>
      ) : visibleTypes.length === 0 ? (
        <div className="dt-empty">
          <Search size={32} />
          <h2>No matches</h2>
          <p>No vehicle types match “{search.trim()}”.</p>
        </div>
      ) : (
        <div className="dt-card">
          <TableScroll>
            <table className="dt-table">
              <thead>
                <tr>
                  <SortableTh sortKey="name" sort={sort}>Vehicle Type</SortableTh>
                  <SortableTh sortKey="size" sort={sort}>Linked Size</SortableTh>
                  <SortableTh sortKey="display_order" sort={sort}>Display Order</SortableTh>
                  <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(type => (
                  <tr key={type.id}>
                    <td>
                      <span className="vs-cell-name">
                        <CarFront size={15} />
                        <span>
                          {type.name}
                          {type.name_ar && <span className="vs-name-ar" dir="rtl" lang="ar">{type.name_ar}</span>}
                        </span>
                      </span>
                    </td>
                    <td>
                      {type.vehicle_size ? (
                        <span className="vt-size">
                          {type.vehicle_size.name}
                          <code className="vs-code">{type.vehicle_size.code}</code>
                          {!type.vehicle_size.is_active && (
                            <span className="dt-status dt-status--warning" title="This size is inactive in the Vehicle Size Master">
                              Size inactive
                            </span>
                          )}
                        </span>
                      ) : <span className="dt-muted">—</span>}
                    </td>
                    <td className="vs-cell-order">{type.display_order}</td>
                    <td>
                      <span className={`dt-status ${type.is_active ? 'dt-status--success' : 'dt-status--muted'}`}>
                        {type.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {canEdit ? (
                        <div className="dt-row-actions">
                          <button
                            className="dt-icon-btn"
                            onClick={() => navigate(`${BASE}/${type.id}/edit`)}
                            title={`Edit ${type.name}`}
                            aria-label={`Edit ${type.name}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className={`vt-status-btn ${type.is_active ? 'is-deactivate' : 'is-activate'}`}
                            onClick={() => handleStatusClick(type)}
                            disabled={busyId === type.id}
                          >
                            <Power size={14} />
                            {type.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      ) : <span className="dt-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <Pager {...pagerProps} unit="types" />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Deactivate vehicle type"
        message={confirm ? `Deactivate "${confirm.name}"? It will be hidden from customers. You can activate it again at any time.` : ''}
        confirmLabel="Deactivate"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const pending = confirm
          setConfirm(null)
          if (pending) setStatus(pending, false)
        }}
      />
    </div>
  )
}

export default VehicleTypes
