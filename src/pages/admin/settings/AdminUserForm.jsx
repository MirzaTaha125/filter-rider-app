import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import { getRoles, signupAdmin } from '../../../api'
import { isAdminRoleName } from './permissionCatalog'
import '../adminForm.css'
import './SettingsForm.css'

const MIN_PASSWORD_LENGTH = 8
const BACK_TO = '/admin/settings?tab=admin-users'

function AdminUserForm() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    countryCode: '+966',
    password: '',
    adminRole: '',
    department: '',
  })
  const [roles, setRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    let cancelled = false
    getRoles()
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : (data?.data ?? data?.roles ?? [])
        setRoles(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (!cancelled) setFormError(err.message || 'Failed to load roles')
      })
      .finally(() => { if (!cancelled) setRolesLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Any role except CUSTOMER/PROVIDER, so custom roles created on the Roles
  // page show up here too.
  const assignableRoles = roles.filter((r) => isAdminRoleName(r.name))

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const validate = () => {
    if (!form.fullName.trim()) return 'Full name is required.'
    if (!form.email.trim()) return 'Email is required.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Enter a valid email address.'
    // The backend DTO marks phone and country_code as required.
    if (!form.phone.trim()) return 'Phone is required.'
    if (!form.countryCode.trim()) return 'Country code is required.'
    if (!form.password) return 'Password is required.'
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    }
    if (!form.adminRole) return 'Role is required.'
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
      await signupAdmin({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        countryCode: form.countryCode.trim(),
        password: form.password,
        adminRole: form.adminRole,
        department: form.department.trim() || undefined,
      })
      navigate(BACK_TO)
    } catch (err) {
      setFormError(err.message || 'Failed to create admin user')
      setSaving(false)
    }
  }

  return (
    <div className="settings-form-page">
      <PageHeader
        title="Create Admin User"
        subtitle="Give a teammate access to the admin panel"
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
            <h2>Account details</h2>
            <p>The new admin signs in with this email and password.</p>
          </header>

          <div className="sf-grid sf-grid--2">
            <div className="sf-field">
              <label htmlFor="fullName">Full name <span className="sf-req">*</span></label>
              <input
                id="fullName"
                type="text"
                placeholder="e.g. Ali Khan"
                value={form.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
                disabled={saving}
                autoFocus
              />
            </div>

            <div className="sf-field">
              <label htmlFor="email">Email <span className="sf-req">*</span></label>
              <input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="sf-field">
              <label htmlFor="countryCode">Country code <span className="sf-req">*</span></label>
              <input
                id="countryCode"
                type="text"
                placeholder="+966"
                value={form.countryCode}
                onChange={(e) => setField('countryCode', e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="sf-field">
              <label htmlFor="phone">Phone <span className="sf-req">*</span></label>
              <input
                id="phone"
                type="text"
                placeholder="500000000"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                disabled={saving}
              />
              <span className="sf-hint">Without the country code.</span>
            </div>

            <div className="sf-field">
              <label htmlFor="password">Password <span className="sf-req">*</span></label>
              <div className="sf-input-affix">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Strong@123"
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  disabled={saving}
                />
                <button
                  type="button"
                  className="sf-affix-btn"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span className="sf-hint">At least {MIN_PASSWORD_LENGTH} characters.</span>
            </div>

            <div className="sf-field">
              <label htmlFor="department">Department</label>
              <input
                id="department"
                type="text"
                placeholder="e.g. Operations"
                value={form.department}
                onChange={(e) => setField('department', e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Role</h2>
            <p>Only a SUPER_ADMIN can create another SUPER_ADMIN.</p>
          </header>

          <div className="sf-field">
            <label htmlFor="adminRole">Role <span className="sf-req">*</span></label>
            <select
              id="adminRole"
              value={form.adminRole}
              onChange={(e) => setField('adminRole', e.target.value)}
              disabled={saving || rolesLoading}
            >
              <option value="">
                {rolesLoading ? 'Loading roles…' : '— Select a role —'}
              </option>
              {assignableRoles.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
            {!rolesLoading && assignableRoles.length === 0 && (
              <span className="sf-hint sf-hint--warn">
                No admin roles exist yet — create one from the Roles tab, or run{' '}
                <code>npm run seed:permissions</code> on the backend for the defaults.
              </span>
            )}
            <span className="sf-hint">
              Every role except CUSTOMER and PROVIDER can be given to an admin.
            </span>
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
              ? <><Loader2 size={16} className="spin" /> Creating…</>
              : 'Create admin'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AdminUserForm
