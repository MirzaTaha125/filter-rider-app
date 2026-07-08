import { useState, useEffect, useCallback } from 'react'
import { Edit, X, Save, Bold, Italic, Link, List, Quote, Code, Cloud, Plus, Trash2 } from 'lucide-react'
import {
  getContentPages,
  createContentPage,
  updateContentPage,
  deleteContentPage,
} from '../../../api/communication.js'
import './ContentManagement.css'

const PAGE_KEYS = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'ABOUT_US',
  'HELP_CENTER',
  'FAQ',
  'CANCELLATION_POLICY',
  'COOKIE_POLICY',
  'REFUND_POLICY',
]

const STATUS_OPTIONS = ['DRAFT', 'PUBLISHED', 'ARCHIVED']

const KEY_LABELS = {
  TERMS_OF_SERVICE: 'Terms of Service',
  PRIVACY_POLICY: 'Privacy Policy',
  ABOUT_US: 'About Us',
  HELP_CENTER: 'Help Center',
  FAQ: 'FAQ',
  CANCELLATION_POLICY: 'Cancellation Policy',
  COOKIE_POLICY: 'Cookie Policy',
  REFUND_POLICY: 'Refund Policy',
}

const EMPTY_CREATE = { key: 'TERMS_OF_SERVICE', title: '', versionLabel: '', status: 'DRAFT', isActive: true }

function ContentManagement() {
  const [contentItems, setContentItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [editorContent, setEditorContent] = useState('')
  const [lastSaved, setLastSaved] = useState(null)
  const [, setTimeUpdate] = useState(0)

  const [createForm, setCreateForm] = useState(EMPTY_CREATE)

  const loadPages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getContentPages()
      setContentItems(data)
    } catch (err) {
      setError(err.message || 'Failed to load content pages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPages() }, [loadPages])

  // Tick to refresh "X seconds ago" display
  useEffect(() => {
    if (!isModalOpen || !lastSaved) return
    const interval = setInterval(() => setTimeUpdate(v => v + 1), 10000)
    return () => clearInterval(interval)
  }, [isModalOpen, lastSaved])

  const openEditor = (item) => {
    setEditingItem(item)
    setEditorContent(item.content || '')
    setLastSaved(null)
    setIsModalOpen(true)
  }

  const closeEditor = () => {
    setIsModalOpen(false)
    setEditingItem(null)
    setEditorContent('')
  }

  const handleSave = async () => {
    if (!editingItem) return
    setSaving(true)
    try {
      const updated = await updateContentPage(editingItem.id, { content: editorContent })
      setContentItems(prev => prev.map(p => p.id === editingItem.id ? updated : p))
      setEditingItem(updated)
      setLastSaved(new Date())
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setEditorContent(editingItem?.content || '')
    closeEditor()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this content page?')) return
    try {
      await deleteContentPage(id)
      setContentItems(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setError(err.message || 'Failed to delete')
    }
  }

  const handleCreate = async () => {
    if (!createForm.title.trim()) return
    setSaving(true)
    try {
      const created = await createContentPage(createForm)
      setContentItems(prev => [...prev, created])
      setIsCreateOpen(false)
      setCreateForm(EMPTY_CREATE)
    } catch (err) {
      setError(err.message || 'Failed to create page')
    } finally {
      setSaving(false)
    }
  }

  const insertFormatting = (format) => {
    const textarea = document.getElementById('content-editor')
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const sel = editorContent.substring(start, end)
    const map = {
      bold:   `<strong>${sel || 'bold text'}</strong>`,
      italic: `<em>${sel || 'italic text'}</em>`,
      link:   `<a href="url">${sel || 'link text'}</a>`,
      list:   sel
        ? `<ul>\n${sel.split('\n').map(l => `  <li>${l}</li>`).join('\n')}\n</ul>`
        : `<ul>\n  <li></li>\n</ul>`,
      quote:  `<blockquote>${sel || 'quote'}</blockquote>`,
      code:   `<code>${sel || 'code'}</code>`,
    }
    const replacement = map[format]
    if (!replacement) return
    const newContent = editorContent.substring(0, start) + replacement + editorContent.substring(end)
    setEditorContent(newContent)
    setTimeout(() => {
      textarea.focus()
      const pos = start + replacement.length
      textarea.setSelectionRange(pos, pos)
    }, 0)
  }

  const getLastSavedText = () => {
    if (!lastSaved) return 'Not saved yet'
    const diffMs = new Date() - lastSaved
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    if (diffMins === 0) return diffSecs < 10 ? 'Just saved' : `${diffSecs}s ago`
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  }

  const versionBadge = editingItem
    ? [editingItem.version_label, editingItem.status].filter(Boolean).join(' - ')
    : ''

  return (
    <div className="content-management">
      <div className="content-management-header-content">
        <div>
          <h1 className="content-management-title">Content Management</h1>
          <p className="content-management-subtitle">Manage platform content and documentation</p>
        </div>
        <button className="btn-create-page" onClick={() => setIsCreateOpen(true)}>
          <Plus size={18} />
          New Page
        </button>
      </div>

      {error && (
        <div className="content-error">
          {error}
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="content-loading">Loading content pages...</div>
      ) : contentItems.length === 0 ? (
        <div className="content-empty">No content pages found. Create one to get started.</div>
      ) : (
        <div className="content-list">
          {contentItems.map((item) => (
            <div key={item.id} className="content-item-card">
              <div className="content-item-header">
                <h3 className="content-item-title">{item.title || KEY_LABELS[item.key] || item.key}</h3>
                <div className="content-item-badges">
                  {item.status && (
                    <span className={`page-status-badge page-status-${item.status?.toLowerCase()}`}>
                      {item.status}
                    </span>
                  )}
                  {item.version_label && (
                    <span className="page-version-label">{item.version_label}</span>
                  )}
                </div>
              </div>
              {item.key && <p className="content-item-key">{item.key}</p>}
              <div className="card-actions">
                <button className="btn-edit" onClick={() => openEditor(item)}>
                  <Edit size={16} />
                  Edit
                </button>
                <button className="btn-card-delete" onClick={() => handleDelete(item.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Page Modal */}
      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-content content-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">Create Content Page</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setIsCreateOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="content-form">
                <div className="form-group">
                  <label>Page Key *</label>
                  <select
                    className="form-select"
                    value={createForm.key}
                    onChange={e => setCreateForm(p => ({ ...p, key: e.target.value }))}
                  >
                    {PAGE_KEYS.map(k => (
                      <option key={k} value={k}>{KEY_LABELS[k] || k}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Terms of Service"
                    value={createForm.title}
                    onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="form-row-create">
                  <div className="form-group">
                    <label>Version Label</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. V2.4 - DRAFT"
                      value={createForm.versionLabel}
                      onChange={e => setCreateForm(p => ({ ...p, versionLabel: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      className="form-select"
                      value={createForm.status}
                      onChange={e => setCreateForm(p => ({ ...p, status: e.target.value }))}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsCreateOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={saving || !createForm.title.trim()}
              >
                <Save size={18} />
                {saving ? 'Creating...' : 'Create Page'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && editingItem && (
        <div className="modal-overlay" onClick={closeEditor}>
          <div className="modal-content editor-modal" onClick={e => e.stopPropagation()}>
            <div className="editor-header">
              <div className="editor-title-section">
                <Edit className="editor-icon" size={20} />
                <h2 className="editor-title">
                  Editing: {editingItem.title || KEY_LABELS[editingItem.key] || editingItem.key}
                </h2>
                {versionBadge && <span className="version-badge">{versionBadge}</span>}
              </div>
              <button className="modal-close-btn" onClick={closeEditor}>
                <X size={24} />
              </button>
            </div>

            <div className="editor-toolbar">
              {[
                { id: 'bold',   Icon: Bold,   title: 'Bold' },
                { id: 'italic', Icon: Italic, title: 'Italic' },
                { id: 'link',   Icon: Link,   title: 'Link' },
                { id: 'list',   Icon: List,   title: 'List' },
                { id: 'quote',  Icon: Quote,  title: 'Blockquote' },
                { id: 'code',   Icon: Code,   title: 'Code' },
              ].map(({ id, Icon, title }) => (
                <button key={id} className="toolbar-btn" onClick={() => insertFormatting(id)} title={title}>
                  <Icon size={18} />
                </button>
              ))}
            </div>

            <div className="editor-body">
              <textarea
                id="content-editor"
                className="editor-textarea"
                placeholder="<p>Start typing your content here...</p>"
                value={editorContent}
                onChange={e => setEditorContent(e.target.value)}
              />
            </div>

            <div className="editor-footer">
              <div className="save-status">
                <Cloud size={16} />
                <span>{getLastSavedText()}</span>
              </div>
              <div className="editor-footer-actions">
                <button className="btn-discard" onClick={handleDiscard} disabled={saving}>
                  Discard Changes
                </button>
                <button className="btn-save-editor" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContentManagement
