import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, X, Save, Trash2 } from 'lucide-react'
import {
  getCommunicationTemplates,
  createCommunicationTemplate,
  updateCommunicationTemplate,
  deleteCommunicationTemplate,
} from '../../../api/communication.js'
import './EmailSmsTemplates.css'

const CHANNEL_OPTIONS = ['EMAIL', 'SMS', 'BOTH']

const CHANNEL_LABELS = { EMAIL: 'Email', SMS: 'SMS', BOTH: 'Email & SMS' }

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

const EMPTY_FORM = { name: '', slug: '', channel: 'BOTH', emailSubject: '', emailBody: '', smsBody: '', isActive: true }

function EmailSmsTemplates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCommunicationTemplates()
      setTemplates(data)
    } catch (err) {
      setError(err.message || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  const openModal = (template = null) => {
    if (template) {
      setEditingTemplate(template)
      setFormData({
        name: template.name,
        slug: template.slug || '',
        channel: template.channel || 'BOTH',
        emailSubject: template.email_subject || '',
        emailBody: template.email_body || '',
        smsBody: template.sms_body || '',
        isActive: template.is_active ?? true,
      })
    } else {
      setEditingTemplate(null)
      setFormData(EMPTY_FORM)
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingTemplate(null)
    setFormData(EMPTY_FORM)
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'name' && !editingTemplate) {
        updated.slug = slugify(value)
      }
      return updated
    })
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return
    setSaving(true)
    try {
      if (editingTemplate) {
        const updated = await updateCommunicationTemplate(editingTemplate.id, formData)
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? updated : t))
      } else {
        const created = await createCommunicationTemplate(formData)
        setTemplates(prev => [...prev, created])
      }
      closeModal()
    } catch (err) {
      setError(err.message || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return
    try {
      await deleteCommunicationTemplate(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      setError(err.message || 'Failed to delete template')
    }
  }

  const showEmailFields = formData.channel === 'EMAIL' || formData.channel === 'BOTH'
  const showSmsField = formData.channel === 'SMS' || formData.channel === 'BOTH'

  return (
    <div className="email-sms-templates">
      <div className="email-sms-templates-header-content">
        <div>
          <h1 className="email-sms-templates-title">Email & SMS Templates</h1>
          <p className="email-sms-templates-subtitle">Manage email and SMS notification templates</p>
        </div>
        <button className="btn-add" onClick={() => openModal()}>
          <Plus size={18} />
          Create Template
        </button>
      </div>

      {error && (
        <div className="templates-error">
          {error}
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      <div className="templates-section">
        {loading ? (
          <div className="templates-loading">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="templates-empty">No templates found. Create one to get started.</div>
        ) : (
          <div className="templates-list">
            {templates.map((template) => (
              <div key={template.id} className="template-item">
                <div className="template-info">
                  <h3>{template.name}</h3>
                  <div className="template-meta">
                    <span className={`channel-badge channel-${template.channel?.toLowerCase()}`}>
                      {CHANNEL_LABELS[template.channel] || template.channel}
                    </span>
                    <span className={`status-badge ${template.is_active ? 'active' : 'inactive'}`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {template.slug && <span className="template-slug">{template.slug}</span>}
                  </div>
                </div>
                <div className="template-actions">
                  <button className="btn-edit" onClick={() => openModal(template)}>
                    <Edit size={16} />
                    Edit
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(template.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content template-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="template-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="template-name">Template Name *</label>
                    <input
                      type="text"
                      id="template-name"
                      className="form-input"
                      placeholder="e.g. Order Confirmation"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="template-channel">Channel *</label>
                    <select
                      id="template-channel"
                      className="form-input"
                      value={formData.channel}
                      onChange={(e) => handleInputChange('channel', e.target.value)}
                    >
                      {CHANNEL_OPTIONS.map(c => (
                        <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="template-slug">Slug</label>
                    <input
                      type="text"
                      id="template-slug"
                      className="form-input"
                      placeholder="e.g. order-confirmation"
                      value={formData.slug}
                      onChange={(e) => handleInputChange('slug', e.target.value)}
                    />
                  </div>
                  <div className="form-group form-group-inline">
                    <label className="toggle-label">
                      <span>Active</span>
                      <div
                        className={`toggle-switch ${formData.isActive ? 'on' : ''}`}
                        onClick={() => handleInputChange('isActive', !formData.isActive)}
                      >
                        <div className="toggle-thumb" />
                      </div>
                    </label>
                  </div>
                </div>

                {showEmailFields && (
                  <>
                    <div className="form-group">
                      <label htmlFor="email-subject">Email Subject</label>
                      <input
                        type="text"
                        id="email-subject"
                        className="form-input"
                        placeholder="e.g. Order Confirmation"
                        value={formData.emailSubject}
                        onChange={(e) => handleInputChange('emailSubject', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email-body">Email Body</label>
                      <textarea
                        id="email-body"
                        className="form-textarea"
                        rows="6"
                        placeholder="Enter email template content..."
                        value={formData.emailBody}
                        onChange={(e) => handleInputChange('emailBody', e.target.value)}
                      />
                    </div>
                  </>
                )}

                {showSmsField && (
                  <div className="form-group">
                    <label htmlFor="sms-body">SMS Body</label>
                    <textarea
                      id="sms-body"
                      className="form-textarea"
                      rows="4"
                      placeholder="Enter SMS template content..."
                      value={formData.smsBody}
                      onChange={(e) => handleInputChange('smsBody', e.target.value)}
                    />
                    <span className="helper-text">Maximum 160 characters recommended</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !formData.name.trim()}>
                <Save size={18} />
                {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailSmsTemplates
