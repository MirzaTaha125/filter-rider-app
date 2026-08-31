import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2, AlertTriangle, Plus, Trash2, Pencil, Check, X, ListChecks, Tag,
} from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import {
  getServices,
  getServiceProperties,
  createServiceProperty,
  deleteServiceProperty,
  getServiceTypes,
  createServiceType,
  updateServiceType,
  getChecklistItems,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
} from '../../../api'
import './ServiceSettings.css'

const PROPERTY_TYPES = ['STRING', 'NUMBER', 'BOOLEAN']
const PRICE_MODES = [
  { value: 'DELTA', label: 'Delta — added to the base price' },
  { value: 'FIXED', label: 'Fixed — replaces the base price' },
]

const EMPTY_TYPE_FORM = {
  name_en: '', name_ar: '', price_mode: 'DELTA', price_value: '0', duration_min: '',
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function ServiceSettings() {
  const { serviceId } = useParams()
  const navigate = useNavigate()

  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState('properties')

  // Properties
  const [properties, setProperties] = useState([])
  const [newProperty, setNewProperty] = useState({ name: '', type: 'STRING' })
  const [propertySaving, setPropertySaving] = useState(false)

  // Types
  const [types, setTypes] = useState([])
  const [activeTypeId, setActiveTypeId] = useState(null)
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE_FORM)
  const [editingTypeId, setEditingTypeId] = useState(null)
  const [typeSaving, setTypeSaving] = useState(false)

  // Checklists — keyed by type id
  const [checklists, setChecklists] = useState({})
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [editingItemId, setEditingItemId] = useState(null)
  const [editingItemTitle, setEditingItemTitle] = useState('')

  // Toast + confirm
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const [confirm, setConfirm] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        const services = await getServices(null, true)
        const found = toArray(services).find(s => s.id === serviceId)
        if (cancelled) return
        if (!found) {
          setLoadError('Service not found')
          return
        }
        setService(found)

        const [props, typeList] = await Promise.all([
          getServiceProperties(serviceId).catch(() => []),
          getServiceTypes(serviceId).catch(() => []),
        ])
        if (cancelled) return

        setProperties(toArray(props))
        const loadedTypes = toArray(typeList)
        setTypes(loadedTypes)
        if (loadedTypes.length > 0) setActiveTypeId(loadedTypes[0].id)
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load service settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [serviceId])

  // Lazily fetch the checklist for whichever type is selected, once per type.
  const fetchedTypes = useRef(new Set())

  useEffect(() => {
    if (!activeTypeId || fetchedTypes.current.has(activeTypeId)) return
    fetchedTypes.current.add(activeTypeId)

    let cancelled = false
    setChecklistLoading(true)
    getChecklistItems(activeTypeId)
      .then(items => {
        if (!cancelled) setChecklists(prev => ({ ...prev, [activeTypeId]: toArray(items) }))
      })
      .catch(() => {
        if (!cancelled) setChecklists(prev => ({ ...prev, [activeTypeId]: [] }))
      })
      .finally(() => { if (!cancelled) setChecklistLoading(false) })

    return () => { cancelled = true }
  }, [activeTypeId])

  /* ---------------- Properties ---------------- */

  const handleAddProperty = async (e) => {
    e.preventDefault()
    const name = newProperty.name.trim()
    if (!name) return
    setPropertySaving(true)
    try {
      const created = await createServiceProperty({
        serviceId,
        name,
        type: newProperty.type,
      })
      setProperties(prev => [...prev, created])
      setNewProperty({ name: '', type: 'STRING' })
      showToast('Property added')
    } catch (err) {
      showToast(err.message || 'Failed to add property', 'error')
    } finally {
      setPropertySaving(false)
    }
  }

  const handleDeleteProperty = (property) => {
    setConfirm({
      title: 'Delete property',
      message: `Delete "${property.name}"? Any data captured against it will no longer be collected.`,
      confirmLabel: 'Delete property',
      onConfirm: async () => {
        try {
          await deleteServiceProperty(property.id)
          setProperties(prev => prev.filter(p => p.id !== property.id))
          showToast('Property deleted')
        } catch (err) {
          showToast(err.message || 'Failed to delete property', 'error')
        }
      },
    })
  }

  /* ---------------- Service types ---------------- */

  const resetTypeForm = () => {
    setTypeForm(EMPTY_TYPE_FORM)
    setEditingTypeId(null)
  }

  const startEditType = (type) => {
    setEditingTypeId(type.id)
    setTypeForm({
      name_en: type.name_en ?? '',
      name_ar: type.name_ar ?? '',
      price_mode: type.price_mode ?? 'DELTA',
      price_value: String(type.price_value ?? '0'),
      duration_min: type.duration_min == null ? '' : String(type.duration_min),
    })
  }

  const handleSubmitType = async (e) => {
    e.preventDefault()
    const name = typeForm.name_en.trim()
    if (!name) {
      showToast('Type name (English) is required', 'error')
      return
    }

    setTypeSaving(true)
    const payload = {
      name,
      nameAr: typeForm.name_ar.trim() || name,
      priceMode: typeForm.price_mode,
      priceValue: typeForm.price_value || '0',
      duration: typeForm.duration_min ? Number(typeForm.duration_min) : undefined,
      isActive: true,
    }

    try {
      if (editingTypeId) {
        const updated = await updateServiceType(editingTypeId, payload)
        setTypes(prev => prev.map(t => (t.id === editingTypeId ? { ...t, ...updated } : t)))
        showToast('Service type updated')
      } else {
        const created = await createServiceType({ ...payload, serviceId })
        setTypes(prev => [...prev, created])
        setActiveTypeId(created.id)
        showToast('Service type added')
      }
      resetTypeForm()
    } catch (err) {
      showToast(err.message || 'Failed to save service type', 'error')
    } finally {
      setTypeSaving(false)
    }
  }

  /* ---------------- Checklist items ---------------- */

  const activeItems = toArray(checklists[activeTypeId])

  const handleAddChecklistItem = async (e) => {
    e.preventDefault()
    const title = newChecklistTitle.trim()
    if (!title || !activeTypeId) return
    try {
      const created = await createChecklistItem(activeTypeId, title, activeItems.length)
      setChecklists(prev => ({ ...prev, [activeTypeId]: [...toArray(prev[activeTypeId]), created] }))
      setNewChecklistTitle('')
    } catch (err) {
      showToast(err.message || 'Failed to add checklist item', 'error')
    }
  }

  const handleSaveChecklistItem = async (itemId) => {
    const title = editingItemTitle.trim()
    if (!title) return
    try {
      const updated = await updateChecklistItem(itemId, { title })
      setChecklists(prev => ({
        ...prev,
        [activeTypeId]: toArray(prev[activeTypeId]).map(i => (i.id === itemId ? { ...i, ...updated } : i)),
      }))
      setEditingItemId(null)
      setEditingItemTitle('')
    } catch (err) {
      showToast(err.message || 'Failed to update item', 'error')
    }
  }

  const handleToggleChecklistItem = async (item) => {
    try {
      const updated = await toggleChecklistItem(item.id, !item.is_active)
      setChecklists(prev => ({
        ...prev,
        [activeTypeId]: toArray(prev[activeTypeId]).map(i => (i.id === item.id ? { ...i, ...updated } : i)),
      }))
    } catch (err) {
      showToast(err.message || 'Failed to update item', 'error')
    }
  }

  const handleDeleteChecklistItem = (item) => {
    setConfirm({
      title: 'Delete checklist item',
      message: `Delete "${item.title}" from this checklist?`,
      confirmLabel: 'Delete item',
      onConfirm: async () => {
        try {
          await deleteChecklistItem(item.id)
          setChecklists(prev => ({
            ...prev,
            [activeTypeId]: toArray(prev[activeTypeId]).filter(i => i.id !== item.id),
          }))
          showToast('Checklist item deleted')
        } catch (err) {
          showToast(err.message || 'Failed to delete item', 'error')
        }
      },
    })
  }

  /* ---------------- Render ---------------- */

  if (loading) {
    return (
      <div className="service-settings-page">
        <PageHeader title="Service Settings" />
        <div className="ss-state"><Loader2 size={32} className="spin" /><span>Loading…</span></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="service-settings-page">
        <PageHeader title="Service Settings" />
        <div className="ss-state ss-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load settings</h2>
          <p>{loadError}</p>
          <button className="ss-btn ss-btn--secondary" onClick={() => navigate('/admin/services')}>
            Back to services
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="service-settings-page">
      <PageHeader
        title="Service Settings"
        subtitle={service?.name_en}
      />

      {toast && (
        <div className={`ss-toast ss-toast--${toast.type}`} role="status">
          {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      <div className="ss-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'properties'}
          className={`ss-tab ${tab === 'properties' ? 'is-active' : ''}`}
          onClick={() => setTab('properties')}
        >
          <Tag size={16} />
          Properties
          <span className="ss-tab-count">{properties.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === 'types'}
          className={`ss-tab ${tab === 'types' ? 'is-active' : ''}`}
          onClick={() => setTab('types')}
        >
          <ListChecks size={16} />
          Types &amp; checklists
          <span className="ss-tab-count">{types.length}</span>
        </button>
      </div>

      {tab === 'properties' && (
        <section className="ss-card">
          <header className="ss-card-head">
            <h2>Service properties</h2>
            <p>Extra details collected from the customer when booking — e.g. “Number of rooms”, “Has balcony”.</p>
          </header>

          {properties.length === 0 ? (
            <p className="ss-empty">No properties yet. Add your first one below.</p>
          ) : (
            <ul className="ss-list">
              {properties.map(prop => (
                <li key={prop.id} className="ss-list-row">
                  <div className="ss-list-main">
                    <span className="ss-list-title">{prop.name}</span>
                    <span className={`ss-chip ss-chip--${(prop.type || 'string').toLowerCase()}`}>{prop.type}</span>
                  </div>
                  <button
                    className="ss-icon-btn ss-icon-btn--danger"
                    onClick={() => handleDeleteProperty(prop)}
                    title="Delete property"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form className="ss-inline-form" onSubmit={handleAddProperty}>
            <input
              type="text"
              placeholder="Property name"
              value={newProperty.name}
              onChange={(e) => setNewProperty(p => ({ ...p, name: e.target.value }))}
              disabled={propertySaving}
            />
            <select
              value={newProperty.type}
              onChange={(e) => setNewProperty(p => ({ ...p, type: e.target.value }))}
              disabled={propertySaving}
            >
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="submit" className="ss-btn ss-btn--primary" disabled={propertySaving || !newProperty.name.trim()}>
              {propertySaving ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
              Add property
            </button>
          </form>
        </section>
      )}

      {tab === 'types' && (
        <div className="ss-split">
          <section className="ss-card">
            <header className="ss-card-head">
              <h2>{editingTypeId ? 'Edit service type' : 'Add service type'}</h2>
              <p>Variants of this service with their own pricing — e.g. “Sedan”, “SUV”.</p>
            </header>

            <form className="ss-form" onSubmit={handleSubmitType}>
              <div className="ss-field">
                <label htmlFor="type_name_en">Name (English) <span className="ss-req">*</span></label>
                <input
                  id="type_name_en"
                  type="text"
                  placeholder="e.g. Sedan"
                  value={typeForm.name_en}
                  onChange={(e) => setTypeForm(f => ({ ...f, name_en: e.target.value }))}
                  disabled={typeSaving}
                />
              </div>

              <div className="ss-field">
                <label htmlFor="type_name_ar">Name (Arabic)</label>
                <input
                  id="type_name_ar"
                  type="text"
                  dir="rtl"
                  placeholder="سيدان"
                  value={typeForm.name_ar}
                  onChange={(e) => setTypeForm(f => ({ ...f, name_ar: e.target.value }))}
                  disabled={typeSaving}
                />
              </div>

              <div className="ss-field">
                <label htmlFor="type_price_mode">Price mode</label>
                <select
                  id="type_price_mode"
                  value={typeForm.price_mode}
                  onChange={(e) => setTypeForm(f => ({ ...f, price_mode: e.target.value }))}
                  disabled={typeSaving}
                >
                  {PRICE_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div className="ss-field-row">
                <div className="ss-field">
                  <label htmlFor="type_price_value">Price value</label>
                  <input
                    id="type_price_value"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={typeForm.price_value}
                    onChange={(e) => setTypeForm(f => ({ ...f, price_value: e.target.value }))}
                    disabled={typeSaving}
                  />
                </div>
                <div className="ss-field">
                  <label htmlFor="type_duration">Duration (min)</label>
                  <input
                    id="type_duration"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Optional"
                    value={typeForm.duration_min}
                    onChange={(e) => setTypeForm(f => ({ ...f, duration_min: e.target.value }))}
                    disabled={typeSaving}
                  />
                </div>
              </div>

              <div className="ss-form-actions">
                {editingTypeId && (
                  <button type="button" className="ss-btn ss-btn--secondary" onClick={resetTypeForm} disabled={typeSaving}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="ss-btn ss-btn--primary" disabled={typeSaving || !typeForm.name_en.trim()}>
                  {typeSaving ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                  {editingTypeId ? 'Save type' : 'Add type'}
                </button>
              </div>
            </form>
          </section>

          <section className="ss-card">
            <header className="ss-card-head">
              <h2>Checklists</h2>
              <p>Steps the provider ticks off while completing the job, per service type.</p>
            </header>

            {types.length === 0 ? (
              <p className="ss-empty">Add a service type first — checklists belong to a type.</p>
            ) : (
              <>
                <div className="ss-pills">
                  {types.map(type => (
                    <span key={type.id} className={`ss-pill ${activeTypeId === type.id ? 'is-active' : ''}`}>
                      <button className="ss-pill-main" onClick={() => setActiveTypeId(type.id)}>
                        {type.name_en}
                      </button>
                      <button
                        className="ss-pill-edit"
                        onClick={() => startEditType(type)}
                        title="Edit this type"
                      >
                        <Pencil size={12} />
                      </button>
                    </span>
                  ))}
                </div>

                {checklistLoading ? (
                  <div className="ss-state ss-state--inline"><Loader2 size={22} className="spin" /></div>
                ) : (
                  <>
                    {activeItems.length === 0 ? (
                      <p className="ss-empty">No checklist items for this type yet.</p>
                    ) : (
                      <ul className="ss-list">
                        {activeItems.map(item => (
                          <li key={item.id} className={`ss-list-row ${item.is_active ? '' : 'is-inactive'}`}>
                            {editingItemId === item.id ? (
                              <div className="ss-list-main">
                                <input
                                  className="ss-inline-input"
                                  value={editingItemTitle}
                                  onChange={(e) => setEditingItemTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveChecklistItem(item.id)
                                    if (e.key === 'Escape') setEditingItemId(null)
                                  }}
                                  autoFocus
                                />
                                <button className="ss-icon-btn" onClick={() => handleSaveChecklistItem(item.id)} title="Save">
                                  <Check size={15} />
                                </button>
                                <button className="ss-icon-btn" onClick={() => setEditingItemId(null)} title="Cancel">
                                  <X size={15} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="ss-list-main">
                                  <button
                                    className={`ss-check ${item.is_active ? 'is-on' : ''}`}
                                    onClick={() => handleToggleChecklistItem(item)}
                                    title={item.is_active ? 'Deactivate' : 'Activate'}
                                  >
                                    {item.is_active && <Check size={13} />}
                                  </button>
                                  <span className="ss-list-title">{item.title}</span>
                                </div>
                                <div className="ss-row-actions">
                                  <button
                                    className="ss-icon-btn"
                                    onClick={() => { setEditingItemId(item.id); setEditingItemTitle(item.title) }}
                                    title="Edit"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    className="ss-icon-btn ss-icon-btn--danger"
                                    onClick={() => handleDeleteChecklistItem(item)}
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    <form className="ss-inline-form" onSubmit={handleAddChecklistItem}>
                      <input
                        type="text"
                        placeholder="Add a checklist item…"
                        value={newChecklistTitle}
                        onChange={(e) => setNewChecklistTitle(e.target.value)}
                      />
                      <button type="submit" className="ss-btn ss-btn--primary" disabled={!newChecklistTitle.trim()}>
                        <Plus size={16} />
                        Add item
                      </button>
                    </form>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const action = confirm?.onConfirm
          setConfirm(null)
          if (action) await action()
        }}
      />
    </div>
  )
}

export default ServiceSettings
