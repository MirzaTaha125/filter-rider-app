import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import { createRole } from '../../../api'
import '../adminForm.css'

const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 255
const BACK_TO = '/admin/settings?tab=roles'

function RoleForm() {
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const validate = () => {
    const name = form.name.trim()
    if (!name) return 'Role name is required.'
    if (name.length > MAX_NAME_LENGTH) {
      return `Role name must be ${MAX_NAME_LENGTH} characters or fewer.`
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
      await createRole({
        name: form.name.trim().toUpperCase(),
        description: form.description.trim(),
      })
      navigate(BACK_TO)
    } catch (err) {
      setFormError(err.message || 'Failed to create role')
      setSaving(false)
    }
  }

  const previewName = form.name.trim().toUpperCase()

  return (
    <div className="settings-form-page">
      <PageHeader
        title="Create Role"
        subtitle="Roles group the permissions an admin account is granted"
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
            <h2>Role details</h2>
            <p>Assign permissions to this role afterwards from the Role Permissions tab.</p>
          </header>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="name">Role name <span className="sf-req">*</span></label>
              <input
                id="name"
                type="text"
                placeholder="e.g. FINANCE_MANAGER"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                disabled={saving}
                maxLength={MAX_NAME_LENGTH}
                autoFocus
              />
              <span className="sf-hint">
                {previewName
                  ? `Will be saved as "${previewName}".`
                  : 'Saved in uppercase. Names must be unique.'}
              </span>
            </div>

            <div className="sf-field">
              <label htmlFor="description">Description</label>
              <input
                id="description"
                type="text"
                placeholder="Brief description of this role"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                disabled={saving}
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
              <span className="sf-hint">Shown on the role card in the Roles tab.</span>
            </div>
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
              : 'Create role'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default RoleForm
