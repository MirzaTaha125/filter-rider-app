import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import { createPermission } from '../../../api'
import { PREDEFINED_PERMISSIONS } from './permissionCatalog'
import '../adminForm.css'

const MAX_NAME_LENGTH = 150
const MAX_SLUG_LENGTH = 150
const MAX_DESCRIPTION_LENGTH = 255
const BACK_TO = '/admin/settings?tab=permissions'

function PermissionForm() {
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', slug: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const applyPreset = (slug) => {
    const preset = PREDEFINED_PERMISSIONS.find(p => p.slug === slug)
    if (!preset) return
    setForm({ name: preset.name, slug: preset.slug, description: preset.description })
    setFormError('')
  }

  const validate = () => {
    const name = form.name.trim()
    const slug = form.slug.trim()
    if (!name) return 'Name is required.'
    if (!slug) return 'Slug is required.'
    if (name.length > MAX_NAME_LENGTH) {
      return `Name must be ${MAX_NAME_LENGTH} characters or fewer.`
    }
    if (slug.length > MAX_SLUG_LENGTH) {
      return `Slug must be ${MAX_SLUG_LENGTH} characters or fewer.`
    }
    if (!/^[a-z0-9]+(\.[a-z0-9]+)+$/.test(slug.toLowerCase())) {
      return 'Slug must look like "orders.view" — lowercase words separated by dots.'
    }
    if (form.description.length > MAX_DESCRIPTION_LENGTH) {
      return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`
    }
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const message = validate()
    if (message) {
      setFormError(message)
      return
    }

    setSaving(true)
    setFormError('')
    try {
      await createPermission({
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        description: form.description.trim(),
      })
      navigate(BACK_TO)
    } catch (err) {
      setFormError(err.message || 'Failed to create permission')
      setSaving(false)
    }
  }

  return (
    <div className="settings-form-page">
      <PageHeader
        title="Create Permission"
        subtitle="Permissions are the individual capabilities you grant to a role"
        onBack={() => navigate(BACK_TO)}
      />

      <form className="sf-form" onSubmit={handleSubmit}>
        {formError && (
          <div className="sf-alert">
            <AlertTriangle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Permission details</h2>
            <p>The slug is what the admin panel checks when deciding what to show.</p>
          </header>

          <div className="sf-field">
            <label htmlFor="preset">Quick select</label>
            <select
              id="preset"
              value=""
              onChange={(e) => applyPreset(e.target.value)}
              disabled={saving}
            >
              <option value="">— Select a predefined permission —</option>
              {PREDEFINED_PERMISSIONS.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name} ({p.slug})</option>
              ))}
            </select>
            <span className="sf-hint">
              Fills the fields below. You can still edit them, or type your own.
            </span>
          </div>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="name">Name <span className="sf-req">*</span></label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Orders View"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                disabled={saving}
                maxLength={MAX_NAME_LENGTH}
              />
              <span className="sf-hint">Human readable. Must be unique.</span>
            </div>

            <div className="sf-field">
              <label htmlFor="slug">Slug <span className="sf-req">*</span></label>
              <input
                id="slug"
                type="text"
                placeholder="e.g. orders.view"
                value={form.slug}
                onChange={(e) => setField('slug', e.target.value)}
                disabled={saving}
                maxLength={MAX_SLUG_LENGTH}
              />
              <span className="sf-hint">Lowercase, dot separated. Saved in lowercase.</span>
            </div>
          </div>

          <div className="sf-field">
            <label htmlFor="description">Description</label>
            <input
              id="description"
              type="text"
              placeholder="e.g. View orders list and details"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              disabled={saving}
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
          </div>
        </section>

        <div className="sf-actions">
          <button
            type="button"
            className="sf-btn sf-btn--secondary"
            onClick={() => navigate(BACK_TO)}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="sf-btn sf-btn--primary" disabled={saving}>
            {saving
              ? <><Loader2 size={16} className="spin" /> Saving…</>
              : 'Create permission'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PermissionForm
