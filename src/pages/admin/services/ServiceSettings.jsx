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
  getServiceChecklist,
  createServiceChecklistItem,
  updateServiceChecklistItem,
  deleteServiceChecklistItem,
  toggleServiceChecklistItem,
} from '../../../api'
import './ServiceSettings.css'
import { PageShimmer } from '../../../components/Shimmer/Shimmer'


const PROPERTY_TYPES = ['STRING', 'NUMBER', 'BOOLEAN']

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
  const [newProperty, setNewProperty] = useState({ name: '', nameAr: '', type: 'STRING' })
  const [propertySaving, setPropertySaving] = useState(false)

  // Checklist (belongs to the service)
  const [checklist, setChecklist] = useState([])
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [newChecklistTitleAr, setNewChecklistTitleAr] = useState('')
  const [checklistSaving, setChecklistSaving] = useState(false)
  const [editingItemId, setEditingItemId] = useState(null)
  const [editingItemTitle, setEditingItemTitle] = useState('')
  const [editingItemTitleAr, setEditingItemTitleAr] = useState('')

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

        const [props, items] = await Promise.all([
          getServiceProperties(serviceId).catch(() => []),
          getServiceChecklist(serviceId).catch(() => []),
        ])
        if (cancelled) return

        setProperties(toArray(props))
        setChecklist(toArray(items))
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load service settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [serviceId])

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
        nameAr: newProperty.nameAr.trim(),
        type: newProperty.type,
      })
      setProperties(prev => [...prev, created])
      setNewProperty({ name: '', nameAr: '', type: 'STRING' })
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

  /* ---------------- Checklist ---------------- */

  const replaceItem = (itemId, updated) => {
    setChecklist(prev => prev.map(i => (i.id === itemId ? { ...i, ...updated } : i)))
  }

  const handleAddChecklistItem = async (e) => {
    e.preventDefault()
    const title = newChecklistTitle.trim()
    if (!title) return
    setChecklistSaving(true)
    try {
      const created = await createServiceChecklistItem(serviceId, title, newChecklistTitleAr.trim())
      setChecklist(prev => [...prev, created])
      setNewChecklistTitle('')
      setNewChecklistTitleAr('')
    } catch (err) {
      showToast(err.message || 'Failed to add checklist item', 'error')
    } finally {
      setChecklistSaving(false)
    }
  }

  const handleSaveChecklistItem = async (itemId) => {
    const title = editingItemTitle.trim()
    if (!title) return
    try {
      replaceItem(itemId, await updateServiceChecklistItem(itemId, { title, title_ar: editingItemTitleAr.trim() }))
      setEditingItemId(null)
      setEditingItemTitle('')
      setEditingItemTitleAr('')
    } catch (err) {
      showToast(err.message || 'Failed to update item', 'error')
    }
  }

  const handleToggleChecklistItem = async (item) => {
    try {
      replaceItem(item.id, await toggleServiceChecklistItem(item.id, !item.is_active))
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
          await deleteServiceChecklistItem(item.id)
          setChecklist(prev => prev.filter(i => i.id !== item.id))
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
        <PageShimmer />
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
          aria-selected={tab === 'checklist'}
          className={`ss-tab ${tab === 'checklist' ? 'is-active' : ''}`}
          onClick={() => setTab('checklist')}
        >
          <ListChecks size={16} />
          Checklist
          <span className="ss-tab-count">{checklist.length}</span>
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
                    <span className="ss-list-title">
                      {prop.name}
                      {prop.name_ar && <span className="ss-title-ar" dir="rtl" lang="ar">{prop.name_ar}</span>}
                    </span>
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
              aria-label="Property name"
              value={newProperty.name}
              onChange={(e) => setNewProperty(p => ({ ...p, name: e.target.value }))}
              disabled={propertySaving}
            />
            <input
              type="text"
              dir="rtl"
              lang="ar"
              placeholder="الاسم بالعربي (اختياري)"
              aria-label="Property name (Arabic, optional)"
              value={newProperty.nameAr}
              onChange={(e) => setNewProperty(p => ({ ...p, nameAr: e.target.value }))}
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

      {tab === 'checklist' && (
        <section className="ss-card">
          <header className="ss-card-head">
            <h2>Checklist</h2>
            <p>Steps the provider ticks off on every order of this service. Active items are also shown to customers as what’s included.</p>
          </header>

          {checklist.length === 0 ? (
            <p className="ss-empty">No checklist items yet. Add the first step below.</p>
          ) : (
            <ul className="ss-list">
              {checklist.map(item => (
                <li key={item.id} className={`ss-list-row ${item.is_active ? '' : 'is-inactive'}`}>
                  {editingItemId === item.id ? (
                    <div className="ss-list-main">
                      <input
                        className="ss-inline-input"
                        aria-label="Item title"
                        value={editingItemTitle}
                        onChange={(e) => setEditingItemTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveChecklistItem(item.id)
                          if (e.key === 'Escape') setEditingItemId(null)
                        }}
                        autoFocus
                      />
                      <input
                        className="ss-inline-input"
                        dir="rtl"
                        lang="ar"
                        placeholder="بالعربي (اختياري)"
                        aria-label="Item title (Arabic, optional)"
                        value={editingItemTitleAr}
                        onChange={(e) => setEditingItemTitleAr(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveChecklistItem(item.id)
                          if (e.key === 'Escape') setEditingItemId(null)
                        }}
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
                        <span className="ss-list-title">
                          {item.title}
                          {item.title_ar && <span className="ss-title-ar" dir="rtl" lang="ar">{item.title_ar}</span>}
                        </span>
                      </div>
                      <div className="ss-row-actions">
                        <button
                          className="ss-icon-btn"
                          onClick={() => { setEditingItemId(item.id); setEditingItemTitle(item.title); setEditingItemTitleAr(item.title_ar ?? '') }}
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
              aria-label="Checklist item"
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              disabled={checklistSaving}
              maxLength={200}
            />
            <input
              type="text"
              dir="rtl"
              lang="ar"
              placeholder="بالعربي (اختياري)"
              aria-label="Checklist item (Arabic, optional)"
              value={newChecklistTitleAr}
              onChange={(e) => setNewChecklistTitleAr(e.target.value)}
              disabled={checklistSaving}
              maxLength={200}
            />
            <button type="submit" className="ss-btn ss-btn--primary" disabled={checklistSaving || !newChecklistTitle.trim()}>
              {checklistSaving ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
              Add item
            </button>
          </form>
        </section>
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
