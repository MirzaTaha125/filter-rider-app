import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, Pencil, Power, Search, AlertTriangle, Car, X, Loader2, Sparkles,
} from 'lucide-react'
import {
  getVehicleMakes,
  createVehicleMake,
  updateVehicleMake,
  getVehicleModels,
  createVehicleModel,
  updateVehicleModel,
  searchVehicleCatalog,
  getVehicleTypes,
} from '../../../api'
import { usePermissions } from '../../../contexts/PermissionsContext'
import ArabicField from '../../../components/ArabicField/ArabicField'
import { TableBlockShimmer } from '../../../components/Shimmer/Shimmer'
import '../adminForm.css'
import './VehicleSizes.css'
import './VehicleCatalog.css'

function toArray(value) {
  return Array.isArray(value) ? value : []
}

/* ---------------- Add / edit dialog ---------------- */

function ItemDialog({ kind, item, makes, types, defaultMakeId, onClose, onSaved }) {
  const isModel = kind === 'model'
  const isEdit = Boolean(item)
  const [form, setForm] = useState({
    name: item?.name ?? '',
    name_ar: item?.name_ar ?? '',
    make_id: item?.make_id ?? defaultMakeId ?? '',
    vehicle_type_id: item?.vehicle_type_id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return setError(isModel ? 'Model name is required.' : 'Make name is required.')
    if (isModel && !form.make_id) return setError('Choose a make.')

    const payload = { name, name_ar: form.name_ar.trim() }
    if (isModel) {
      payload.make_id = form.make_id
      payload.vehicle_type_id = form.vehicle_type_id || null
    }

    setSaving(true)
    try {
      const saved = isModel
        ? (isEdit ? await updateVehicleModel(item.id, payload) : await createVehicleModel(payload))
        : (isEdit ? await updateVehicleMake(item.id, payload) : await createVehicleMake(payload))
      onSaved(saved)
    } catch (err) {
      setError(err.message || 'Failed to save')
      setSaving(false)
    }
  }

  const title = `${isEdit ? 'Edit' : 'Add'} ${isModel ? 'model' : 'make'}`

  return (
    <div className="vc-overlay" role="presentation" onClick={onClose}>
      <form
        className="vc-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
      >
        <header className="vc-dialog-head">
          <h2>{title}</h2>
          <button type="button" className="dt-icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>

        {error && <div className="sf-alert" role="alert"><AlertTriangle size={16} /><span>{error}</span></div>}

        {isModel && (
          <div className="sf-field">
            <label htmlFor="vc-make">Make <span className="sf-req">*</span></label>
            <select id="vc-make" value={form.make_id} onChange={(e) => setField('make_id', e.target.value)} disabled={saving}>
              <option value="">Select a make…</option>
              {makes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}

        <div className="sf-field">
          <label htmlFor="vc-name">{isModel ? 'Model name' : 'Make name'} <span className="sf-req">*</span></label>
          <input
            id="vc-name"
            type="text"
            placeholder={isModel ? 'e.g. Camry' : 'e.g. Toyota'}
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            disabled={saving}
            maxLength={80}
            autoFocus
          />
        </div>

        <ArabicField
          id="vc-name-ar"
          label={isModel ? 'Model name' : 'Make name'}
          placeholder={isModel ? 'مثال: كامري' : 'مثال: تويوتا'}
          value={form.name_ar}
          onChange={(value) => setField('name_ar', value)}
          disabled={saving}
          maxLength={80}
        />

        {isModel && (
          <div className="sf-field">
            <label htmlFor="vc-type">Vehicle type</label>
            <select id="vc-type" value={form.vehicle_type_id} onChange={(e) => setField('vehicle_type_id', e.target.value)} disabled={saving}>
              <option value="">Not set</option>
              {types.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.vehicle_size?.name ? ` (${t.vehicle_size.name})` : ''}
                </option>
              ))}
            </select>
            <span className="sf-hint">Lets the app pick the vehicle size when a customer chooses this model.</span>
          </div>
        )}

        <div className="sf-actions">
          <button type="button" className="sf-btn sf-btn--secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="sf-btn sf-btn--primary" disabled={saving}>
            {saving ? <><Loader2 size={16} className="spin" /> Saving…</> : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ---------------- "Try the app search" ---------------- */

function SearchPreview() {
  const [q, setQ] = useState('')
  const [result, setResult] = useState({ q: '', items: [], error: '' })
  const term = q.trim()

  useEffect(() => {
    if (term.length < 2) return
    let cancelled = false
    const timer = setTimeout(() => {
      searchVehicleCatalog(term)
        .then(items => { if (!cancelled) setResult({ q: term, items: toArray(items), error: '' }) })
        .catch(err => { if (!cancelled) setResult({ q: term, items: [], error: err.message || 'Search failed' }) })
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [term])

  const loading = term.length >= 2 && result.q !== term
  const items = result.q === term ? result.items : []

  return (
    <section className="sf-card vc-preview">
      <header className="vc-preview-head">
        <Sparkles size={16} />
        <h2>Try the app search</h2>
        <span>What a customer sees while typing “add your vehicle”.</span>
      </header>
      <div className="dt-search vc-preview-input">
        <Search size={16} />
        <input
          type="search"
          placeholder="Type like a customer, e.g. toy cam or كامري"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Try the app search"
        />
        {loading && <Loader2 size={16} className="spin" />}
      </div>
      {term.length >= 2 && !loading && (
        result.error ? (
          <p className="vc-preview-empty">{result.error}</p>
        ) : items.length === 0 ? (
          <p className="vc-preview-empty">No matches. The customer can still type the make and model by hand.</p>
        ) : (
          <ul className="vc-preview-list">
            {items.map(item => (
              <li key={item.model.id}>
                <span className="vc-preview-label">{item.label}</span>
                <span className="vc-preview-ar" dir="rtl" lang="ar">{item.label_ar}</span>
                {item.vehicle_type
                  ? <span className="dt-status dt-status--info">{item.vehicle_type.name} · {item.vehicle_type.vehicle_size_name}</span>
                  : <span className="dt-status dt-status--muted">No type</span>}
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  )
}

/* ---------------- Page ---------------- */

function VehicleCatalog() {
  const { hasPermission } = usePermissions()
  const canCreate = hasPermission('vehicle_catalog.create')
  const canEdit = hasPermission('vehicle_catalog.edit')

  const [makes, setMakes] = useState([])
  const [types, setTypes] = useState([])
  const [models, setModels] = useState([])
  const [selectedMakeId, setSelectedMakeId] = useState('')
  const [makeSearch, setMakeSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const loadMakes = useCallback(async () => {
    try {
      const [makeList, typeList] = await Promise.all([getVehicleMakes(), getVehicleTypes().catch(() => [])])
      const list = toArray(makeList)
      setMakes(list)
      setTypes(toArray(typeList).filter(t => t.is_active))
      setSelectedMakeId(prev => prev || list[0]?.id || '')
    } catch (err) {
      setError(err.message || 'Failed to load makes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMakes() }, [loadMakes])

  const loadModels = useCallback(async (makeId) => {
    if (!makeId) { setModels([]); return }
    setModelsLoading(true)
    try {
      setModels(toArray(await getVehicleModels({ makeId })))
    } catch (err) {
      setError(err.message || 'Failed to load models')
    } finally {
      setModelsLoading(false)
    }
  }, [])

  useEffect(() => { loadModels(selectedMakeId) }, [selectedMakeId, loadModels])

  const selectedMake = makes.find(m => m.id === selectedMakeId)

  const visibleMakes = useMemo(() => {
    const t = makeSearch.trim().toLowerCase()
    return t
      ? makes.filter(m => m.name.toLowerCase().includes(t) || (m.name_ar || '').includes(makeSearch.trim()))
      : makes
  }, [makes, makeSearch])

  const visibleModels = useMemo(() => {
    const t = modelSearch.trim().toLowerCase()
    return t
      ? models.filter(m => m.name.toLowerCase().includes(t) || (m.name_ar || '').includes(modelSearch.trim()))
      : models
  }, [models, modelSearch])

  const toggleMake = async (make) => {
    setBusyId(make.id)
    try {
      await updateVehicleMake(make.id, { is_active: !make.is_active })
      setMakes(list => list.map(m => (m.id === make.id ? { ...m, is_active: !make.is_active } : m)))
    } catch (err) {
      setError(err.message || 'Failed to change status')
    } finally {
      setBusyId(null)
    }
  }

  const toggleModel = async (model) => {
    setBusyId(model.id)
    try {
      const updated = await updateVehicleModel(model.id, { is_active: !model.is_active })
      setModels(list => list.map(m => (m.id === model.id ? { ...m, ...updated } : m)))
    } catch (err) {
      setError(err.message || 'Failed to change status')
    } finally {
      setBusyId(null)
    }
  }

  const onSaved = async (saved) => {
    const kind = dialog?.kind
    setDialog(null)
    if (kind === 'make') {
      await loadMakes()
      if (saved?.id) setSelectedMakeId(saved.id)
    } else {
      // Refresh the counts on the left and the list on the right.
      await loadMakes()
      if (saved?.make_id && saved.make_id !== selectedMakeId) setSelectedMakeId(saved.make_id)
      else loadModels(selectedMakeId)
    }
  }

  const totalModels = makes.reduce((n, m) => n + (m.models_count ?? 0), 0)

  return (
    <div className="vehicle-sizes vehicle-catalog">
      <header className="dt-page-head vc-head">
        <div className="vc-head-copy">
          <p className="dt-page-sub">Car makes and models customers pick from when adding their vehicle.</p>
          {!loading && makes.length > 0 && (
            <div className="vc-stats">
              <span><strong>{makes.length}</strong> makes</span>
              <span><strong>{totalModels}</strong> models</span>
            </div>
          )}
        </div>
        {canCreate && (
          <button className="dt-btn dt-btn--primary" onClick={() => setDialog({ kind: 'make' })}>
            <Plus size={18} /> Add Make
          </button>
        )}
      </header>

      {error && (
        <div className="vs-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss">×</button>
        </div>
      )}

      <SearchPreview />

      {loading ? (
        <TableBlockShimmer columns={4} />
      ) : makes.length === 0 ? (
        <div className="dt-empty">
          <Car size={32} />
          <h2>No makes yet</h2>
          <p>Load the Saudi list with <code>npm run seed:vehicle-catalog</code> in the backend, or add makes by hand.</p>
          {canCreate && (
            <button className="dt-btn dt-btn--primary" onClick={() => setDialog({ kind: 'make' })}>
              <Plus size={16} /> Add Make
            </button>
          )}
        </div>
      ) : (
        <div className="vc-layout">
          <section className="dt-card vc-makes">
            <div className="vc-col-head">
              <h2>Makes</h2>
              <div className="dt-search">
                <Search size={14} />
                <input type="search" placeholder="Filter makes…" value={makeSearch} onChange={(e) => setMakeSearch(e.target.value)} aria-label="Filter makes" />
              </div>
            </div>
            <ul className="vc-make-list">
              {visibleMakes.map(make => (
                <li key={make.id}>
                  <button
                    type="button"
                    className={`vc-make ${make.id === selectedMakeId ? 'is-selected' : ''} ${make.is_active ? '' : 'is-inactive'}`}
                    onClick={() => setSelectedMakeId(make.id)}
                    aria-pressed={make.id === selectedMakeId}
                  >
                    <span className="vc-make-name">
                      {make.name}
                      {make.name_ar && <span className="vs-name-ar" dir="rtl" lang="ar">{make.name_ar}</span>}
                    </span>
                    <span className="vc-make-count">{make.models_count ?? 0}</span>
                  </button>
                </li>
              ))}
              {visibleMakes.length === 0 && <li className="vc-preview-empty">No makes match.</li>}
            </ul>
          </section>

          <section className="dt-card vc-models">
            <div className="vc-col-head">
              <div className="vc-models-title">
                <h2>{selectedMake ? selectedMake.name : 'Models'}</h2>
                {selectedMake?.name_ar && <span className="vc-models-ar" dir="rtl" lang="ar">{selectedMake.name_ar}</span>}
                {selectedMake && (
                  <span className={`dt-status ${selectedMake.is_active ? 'dt-status--success' : 'dt-status--muted'}`}>
                    {selectedMake.is_active ? 'Active' : 'Inactive'}
                  </span>
                )}
                {selectedMake && canEdit && (
                  <>
                    <button className="dt-icon-btn" onClick={() => setDialog({ kind: 'make', item: selectedMake })} aria-label={`Edit ${selectedMake.name}`} title="Edit make">
                      <Pencil size={14} />
                    </button>
                    <button
                      className={`vt-status-btn ${selectedMake.is_active ? 'is-deactivate' : 'is-activate'}`}
                      onClick={() => toggleMake(selectedMake)}
                      disabled={busyId === selectedMake.id}
                    >
                      <Power size={14} /> {selectedMake.is_active ? 'Deactivate make' : 'Activate make'}
                    </button>
                  </>
                )}
              </div>
              <div className="vc-col-tools">
                <div className="dt-search">
                  <Search size={14} />
                  <input type="search" placeholder="Filter models…" value={modelSearch} onChange={(e) => setModelSearch(e.target.value)} aria-label="Filter models" />
                </div>
                {canCreate && selectedMake && (
                  <button className="dt-btn dt-btn--primary" onClick={() => setDialog({ kind: 'model', defaultMakeId: selectedMake.id })}>
                    <Plus size={16} /> Add Model
                  </button>
                )}
              </div>
            </div>

            {modelsLoading ? (
              <TableBlockShimmer columns={4} />
            ) : visibleModels.length === 0 ? (
              <p className="vc-preview-empty">{models.length === 0 ? 'No models for this make yet.' : 'No models match.'}</p>
            ) : (
              <div className="vc-table-wrap">
                <table className="dt-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Vehicle type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleModels.map(model => (
                      <tr key={model.id}>
                        <td>
                          <span className="vs-cell-name">
                            <span>
                              {model.name}
                              {model.name_ar && <span className="vs-name-ar" dir="rtl" lang="ar">{model.name_ar}</span>}
                            </span>
                          </span>
                        </td>
                        <td>
                          {model.vehicle_type
                            ? <span>{model.vehicle_type.name}{model.vehicle_type.vehicle_size?.name ? <span className="dt-muted"> · {model.vehicle_type.vehicle_size.name}</span> : null}</span>
                            : <span className="dt-muted">Not set</span>}
                        </td>
                        <td>
                          <span className={`dt-status ${model.is_active ? 'dt-status--success' : 'dt-status--muted'}`}>
                            {model.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {canEdit ? (
                            <div className="dt-row-actions">
                              <button className="dt-icon-btn" onClick={() => setDialog({ kind: 'model', item: model })} aria-label={`Edit ${model.name}`} title="Edit">
                                <Pencil size={15} />
                              </button>
                              <button
                                className={`vt-status-btn ${model.is_active ? 'is-deactivate' : 'is-activate'}`}
                                onClick={() => toggleModel(model)}
                                disabled={busyId === model.id}
                              >
                                <Power size={14} /> {model.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          ) : <span className="dt-muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {dialog && (
        <ItemDialog
          kind={dialog.kind}
          item={dialog.item}
          defaultMakeId={dialog.defaultMakeId ?? selectedMakeId}
          makes={makes}
          types={types}
          onClose={() => setDialog(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}

export default VehicleCatalog
