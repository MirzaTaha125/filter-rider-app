import { useState, useEffect } from 'react'
import { Save, Key, Globe, Shield, Users, CheckCircle, Loader2, Eye, EyeOff, Plus, Trash2, Search, X, UserPlus } from 'lucide-react'
import { getRoles, createRole, assignRole, removeRole, getUserRoles, getUsers, getSettings, createSetting, updateSetting, saveGoogleMapsKeyToBackend, signupAdmin, getPermissions, createPermission, getRolePermissions, setRolePermissions } from '../../../api'
import { useAppSettings } from '../../../contexts/AppSettingsContext'
import './Settings.css'


function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsError, setSettingsError] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [general, setGeneral] = useState({ platformName: 'Filter', defaultLanguage: 'en' })
  const [apiKeys, setApiKeys] = useState({ googleMapsApiKey: '', paymentGatewayApiKey: '' })
  const [showGoogleKey, setShowGoogleKey] = useState(false)
  const [showPaymentKey, setShowPaymentKey] = useState(false)
  const [security, setSecurity] = useState({ sessionTimeoutMinutes: 30, requireTwoFactor: true })
  const [settingIds, setSettingIds] = useState({}) // key → id
  const { setGoogleMapsApiKey } = useAppSettings()

  // Roles Management state
  const [allRoles, setAllRoles] = useState([])
  const [rolesListLoading, setRolesListLoading] = useState(false)
  const [createRoleModal, setCreateRoleModal] = useState(false)
  const [newRole, setNewRole] = useState({ name: '', description: '' })
  const [createRoleLoading, setCreateRoleLoading] = useState(false)
  const [createRoleError, setCreateRoleError] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [userSearchResults, setUserSearchResults] = useState([])
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null) // { id, name, email }
  const [selectedUserRoles, setSelectedUserRoles] = useState([])
  const [selectedUserRolesLoading, setSelectedUserRolesLoading] = useState(false)
  const [assignModal, setAssignModal] = useState({ open: false, userId: '', roleId: '', loading: false, error: '' })

  // Admin User creation state
  const [addAdminModal, setAddAdminModal] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ fullName: '', email: '', phone: '', password: '', adminRole: '', department: '' })
  const [addAdminLoading, setAddAdminLoading] = useState(false)
  const [addAdminError, setAddAdminError] = useState('')
  const [showAdminPassword, setShowAdminPassword] = useState(false)

  useEffect(() => {
    getSettings()
      .then((data) => {
        const arr = Array.isArray(data) ? data : (data?.items ?? data?.data ?? [])
        if (!Array.isArray(arr)) return
        const ids = {}
        arr.forEach((s) => { if (s?.key) ids[s.key] = s.id })
        setSettingIds(ids)
        const get = (key) => arr.find((s) => s.key === key)?.value
        const pn = get('platform_name'); if (pn != null) setGeneral((g) => ({ ...g, platformName: pn }))
        const dl = get('default_language'); if (dl != null) setGeneral((g) => ({ ...g, defaultLanguage: dl }))
        const gmk = get('google_maps_server_key'); if (gmk != null) setApiKeys((k) => ({ ...k, googleMapsApiKey: gmk }))
        const pgk = get('payment_gateway_api_key'); if (pgk != null) setApiKeys((k) => ({ ...k, paymentGatewayApiKey: pgk }))
        const sto = get('session_timeout_minutes'); if (sto != null) setSecurity((sec) => ({ ...sec, sessionTimeoutMinutes: Number(sto) || 30 }))
        const rtf = get('require_two_factor'); if (rtf != null) setSecurity((sec) => ({ ...sec, requireTwoFactor: rtf === 'true' || rtf === true }))
      })
      .catch(() => setSettingsError('Failed to load settings'))
      .finally(() => setSettingsLoading(false))
  }, [])

  // Permissions tab state
  const [allPermissions, setAllPermissions] = useState([])
  const [permsLoading, setPermsLoading] = useState(false)
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState('')
  const [checkedPermIds, setCheckedPermIds] = useState(new Set())
  const [rolePermsLoading, setRolePermsLoading] = useState(false)
  const [permsSaving, setPermsSaving] = useState(false)
  const [permsError, setPermsError] = useState('')
  const [permsSuccess, setPermsSuccess] = useState(false)

  // Predefined permissions list for dropdown
  const PREDEFINED_PERMISSIONS = [
    { name: 'Dashboard View', slug: 'dashboard.view', description: 'View dashboard and statistics' },
    { name: 'Orders View', slug: 'orders.view', description: 'View orders list and details' },
    { name: 'Orders Manage', slug: 'orders.manage', description: 'Create, update and manage orders' },
    { name: 'Customers View', slug: 'customers.view', description: 'View customer list and profiles' },
    { name: 'Customers Manage', slug: 'customers.manage', description: 'Edit and manage customer accounts' },
    { name: 'Providers View', slug: 'providers.view', description: 'View service providers and requests' },
    { name: 'Providers Manage', slug: 'providers.manage', description: 'Approve, reject and manage providers' },
    { name: 'Services View', slug: 'services.view', description: 'View services, add-ons and pricing matrix' },
    { name: 'Services Manage', slug: 'services.manage', description: 'Create and manage services' },
    { name: 'Pricing View', slug: 'pricing.view', description: 'View pricing, surge and regional pricing' },
    { name: 'Pricing Manage', slug: 'pricing.manage', description: 'Edit fee configuration and pricing rules' },
    { name: 'Assets View', slug: 'assets.view', description: 'View asset categories and sizes' },
    { name: 'Assets Manage', slug: 'assets.manage', description: 'Manage asset categories and sizes' },
    { name: 'Wallet View', slug: 'wallet.view', description: 'View wallet, payments and transactions' },
    { name: 'Wallet Manage', slug: 'wallet.manage', description: 'Approve payments and manage wallet' },
    { name: 'Promotions View', slug: 'promotions.view', description: 'View promotions and discount codes' },
    { name: 'Promotions Manage', slug: 'promotions.manage', description: 'Create and manage promotions' },
    { name: 'Communication View', slug: 'communication.view', description: 'View templates and notifications' },
    { name: 'Communication Manage', slug: 'communication.manage', description: 'Manage communication templates' },
    { name: 'Analytics View', slug: 'analytics.view', description: 'View analytics and reports' },
    { name: 'Disputes View', slug: 'disputes.view', description: 'View dispute cases' },
    { name: 'Disputes Manage', slug: 'disputes.manage', description: 'Resolve and manage disputes' },
    { name: 'Zones View', slug: 'zones.view', description: 'View zone and map configuration' },
    { name: 'Zones Manage', slug: 'zones.manage', description: 'Create and manage service zones' },
    { name: 'Settings View', slug: 'settings.view', description: 'Access system settings' },
    { name: 'Settings Manage', slug: 'settings.manage', description: 'Modify system settings and configuration' },
  ]

  // Create permission state
  const [createPermModal, setCreatePermModal] = useState(false)
  const [newPerm, setNewPerm] = useState({ name: '', slug: '', description: '' })
  const [createPermLoading, setCreatePermLoading] = useState(false)
  const [createPermError, setCreatePermError] = useState('')

  // Seed permissions state
  const [seedLoading, setSeedLoading] = useState(false)
  const [seedResult, setSeedResult] = useState(null) // { created, skipped, failed }

  const handleCreatePermission = async () => {
    if (!newPerm.name.trim() || !newPerm.slug.trim()) { setCreatePermError('Name and slug are required'); return }
    setCreatePermLoading(true)
    setCreatePermError('')
    try {
      await createPermission({ name: newPerm.name.trim(), slug: newPerm.slug.trim(), description: newPerm.description.trim() })
      setCreatePermModal(false)
      setNewPerm({ name: '', slug: '', description: '' })
      loadPermissionsTab()
    } catch (e) {
      setCreatePermError(e.message || 'Failed to create permission')
    } finally {
      setCreatePermLoading(false)
    }
  }

  const handleSeedPermissions = async () => {
    setSeedLoading(true)
    setSeedResult(null)
    let created = 0, skipped = 0, failed = 0
    for (const perm of PREDEFINED_PERMISSIONS) {
      try {
        await createPermission({ name: perm.name, slug: perm.slug, description: perm.description })
        created++
      } catch (e) {
        if (e.status === 409) skipped++ // already exists
        else failed++
      }
    }
    setSeedResult({ created, skipped, failed })
    setSeedLoading(false)
    loadPermissionsTab()
  }

  const loadPermissionsTab = () => {
    setPermsLoading(true)
    getPermissions()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data ?? data?.permissions ?? [])
        setAllPermissions(list)
      })
      .catch(() => {})
      .finally(() => setPermsLoading(false))
  }

  const handleRoleForPermsChange = async (roleId) => {
    setSelectedRoleForPerms(roleId)
    setCheckedPermIds(new Set())
    setPermsError('')
    if (!roleId) return
    setRolePermsLoading(true)
    try {
      const data = await getRolePermissions(roleId)
      // Response: { message, data: { role, permissions: [] } }
      const raw = Array.isArray(data) ? data
        : (data?.data?.permissions ?? data?.permissions ?? data?.data ?? data)
      const list = Array.isArray(raw) ? raw : []
      setCheckedPermIds(new Set(list.map((p) => p.id ?? p._id ?? p)))
    } catch (e) {
      setPermsError(e.message || 'Failed to load role permissions')
    } finally {
      setRolePermsLoading(false)
    }
  }

  const togglePerm = (id) => {
    setCheckedPermIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSaveRolePermissions = async () => {
    if (!selectedRoleForPerms) return
    setPermsSaving(true)
    setPermsError('')
    setPermsSuccess(false)
    try {
      await setRolePermissions(selectedRoleForPerms, Array.from(checkedPermIds))
      setPermsSuccess(true)
      setTimeout(() => setPermsSuccess(false), 3000)
    } catch (e) {
      setPermsError(e.message || 'Failed to save permissions')
    } finally {
      setPermsSaving(false)
    }
  }

  const loadAllRoles = () => {
    setRolesListLoading(true)
    getRoles()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data ?? data?.roles ?? [])
        setAllRoles(list)
      })
      .catch(() => {})
      .finally(() => setRolesListLoading(false))
  }

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) { setCreateRoleError('Role name is required'); return }
    setCreateRoleLoading(true)
    setCreateRoleError('')
    try {
      await createRole({ name: newRole.name.trim().toUpperCase(), description: newRole.description.trim() })
      setCreateRoleModal(false)
      setNewRole({ name: '', description: '' })
      loadAllRoles()
    } catch (e) {
      setCreateRoleError(e.message || 'Failed to create role')
    } finally {
      setCreateRoleLoading(false)
    }
  }

  const handleUserSearch = async (query) => {
    setUserSearch(query)
    setSelectedUser(null)
    setSelectedUserRoles([])
    if (!query.trim()) { setUserSearchResults([]); return }
    setUserSearchLoading(true)
    try {
      const data = await getUsers({ search: query.trim(), limit: 10 })
      const list = Array.isArray(data) ? data : (data?.users ?? data?.items ?? data?.data ?? [])
      setUserSearchResults(list)
    } catch {
      setUserSearchResults([])
    } finally {
      setUserSearchLoading(false)
    }
  }

  const handleSelectUser = async (user) => {
    setSelectedUser(user)
    setUserSearch(user.name ?? user.full_name ?? user.email ?? '')
    setUserSearchResults([])
    setSelectedUserRolesLoading(true)
    try {
      const data = await getUserRoles(user.id)
      const list = Array.isArray(data) ? data : (data?.data ?? data?.roles ?? [])
      setSelectedUserRoles(list)
    } catch {
      setSelectedUserRoles([])
    } finally {
      setSelectedUserRolesLoading(false)
    }
  }

  const handleAssignRole = async () => {
    setAssignModal((s) => ({ ...s, loading: true, error: '' }))
    try {
      await assignRole(assignModal.userId, assignModal.roleId)
      setAssignModal({ open: false, userId: '', roleId: '', loading: false, error: '' })
      if (selectedUser) handleSelectUser(selectedUser)
    } catch (e) {
      setAssignModal((s) => ({ ...s, error: e.message || 'Failed to assign role', loading: false }))
    }
  }

  const handleRemoveRole = async (userId, roleId) => {
    try {
      await removeRole(userId, roleId)
      setSelectedUserRoles((prev) => prev.filter((r) => (r.id ?? r.roleId) !== roleId))
    } catch (e) {
      alert(e.message || 'Failed to remove role')
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdmin.fullName.trim() || !newAdmin.email.trim() || !newAdmin.password.trim() || !newAdmin.adminRole) {
      setAddAdminError('Full name, email, password and role are required')
      return
    }
    setAddAdminLoading(true)
    setAddAdminError('')
    try {
      await signupAdmin(newAdmin)
      setAddAdminModal(false)
      setNewAdmin({ fullName: '', email: '', phone: '', password: '', adminRole: '', department: '' })
      alert('Admin user created successfully!')
    } catch (e) {
      setAddAdminError(e.message || 'Failed to create admin user')
    } finally {
      setAddAdminLoading(false)
    }
  }

  const upsertSetting = async (key, value, type = 'STRING') => {
    const id = settingIds[key]
    if (id) {
      const updated = await updateSetting(id, { value: String(value) })
      return updated
    }
    const created = await createSetting({ key, value: String(value), type })
    setSettingIds((prev) => ({ ...prev, [key]: created?.id ?? created?.data?.id }))
    return created
  }

  const handleSaveGeneral = async () => {
    setSaveError('')
    setSaveLoading(true)
    try {
      await Promise.all([
        upsertSetting('platform_name', general.platformName),
        upsertSetting('default_language', general.defaultLanguage),
      ])
      setShowSuccessModal(true)
    } catch (e) {
      setSaveError(e.message || 'Failed to save')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleSaveApiKeys = async () => {
    setSaveError('')
    setSaveLoading(true)
    try {
      await saveGoogleMapsKeyToBackend(apiKeys.googleMapsApiKey)
      setGoogleMapsApiKey(apiKeys.googleMapsApiKey || '')
      if (apiKeys.paymentGatewayApiKey) {
        await upsertSetting('payment_gateway_api_key', apiKeys.paymentGatewayApiKey, 'SECRET')
      }
      setShowSuccessModal(true)
    } catch (e) {
      setSaveError(e.message || 'Failed to save API key')
    } finally {
      setSaveLoading(false)
    }
  }


  const handleSaveSecurity = async () => {
    setSaveError('')
    setSaveLoading(true)
    try {
      await Promise.all([
        upsertSetting('session_timeout_minutes', String(security.sessionTimeoutMinutes)),
        upsertSetting('require_two_factor', String(security.requireTwoFactor)),
      ])
      setShowSuccessModal(true)
    } catch (e) {
      setSaveError(e.message || 'Failed to save')
    } finally {
      setSaveLoading(false)
    }
  }


  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Configure platform settings and preferences</p>
      </div>

      <div className="settings-container">
        <div className="settings-sidebar">
          <button className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
            <Globe size={18} />
            General
          </button>
          <button className={`settings-tab ${activeTab === 'api' ? 'active' : ''}`} onClick={() => setActiveTab('api')}>
            <Key size={18} />
            API Keys
          </button>
          <button className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
            <Shield size={18} />
            Security
          </button>
          <button className={`settings-tab ${activeTab === 'admin-users' ? 'active' : ''}`} onClick={() => { setActiveTab('admin-users'); loadAllRoles() }}>
            <UserPlus size={18} />
            Admin Users
          </button>
          <button className={`settings-tab ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => { setActiveTab('roles'); loadAllRoles() }}>
            <Users size={18} />
            Roles
          </button>
          <button className={`settings-tab ${activeTab === 'permissions' ? 'active' : ''}`} onClick={() => { setActiveTab('permissions'); loadAllRoles(); loadPermissionsTab() }}>
            <Shield size={18} />
            Role Permissions
          </button>
        </div>

        <div className="settings-content">
          {(settingsError || saveError) && (
            <div className="settings-message settings-message--error">{settingsError || saveError}</div>
          )}
          {settingsLoading && activeTab !== 'permissions' && (
            <div className="settings-loading"><Loader2 size={24} className="spin" /> Loading settings…</div>
          )}
          {activeTab === 'general' && (
            <div className="settings-section">
              <h2>General Settings</h2>
              <div className="settings-form">
                <div className="form-group">
                  <label>Platform Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={general.platformName}
                    onChange={(e) => setGeneral((g) => ({ ...g, platformName: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Default Language</label>
                  <select
                    className="form-select"
                    value={general.defaultLanguage}
                    onChange={(e) => setGeneral((g) => ({ ...g, defaultLanguage: e.target.value }))}
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
                <button className="btn-save" onClick={handleSaveGeneral} disabled={saveLoading}>
                  {saveLoading ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="settings-section">
              <h2>API Keys</h2>
              <div className="settings-form">
                <div className="form-group">
                  <label>Google Maps API Key</label>
                  <div className="settings-input-with-eye">
                    <input
                      type={showGoogleKey ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Enter API key"
                      value={apiKeys.googleMapsApiKey}
                      onChange={(e) => setApiKeys((k) => ({ ...k, googleMapsApiKey: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="settings-eye-btn"
                      onClick={() => setShowGoogleKey((s) => !s)}
                      aria-label={showGoogleKey ? 'Hide key' : 'Show key'}
                      title={showGoogleKey ? 'Hide' : 'Show'}
                    >
                      {showGoogleKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <span className="form-hint">Used for Dashboard and Zone Management maps. Enable <strong>Maps JavaScript API</strong> for this key in <a href="https://console.cloud.google.com/apis/library/maps-javascript-backend.googleapis.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>.</span>
                </div>
                <div className="form-group">
                  <label>Payment Gateway API Key</label>
                  <div className="settings-input-with-eye">
                    <input
                      type={showPaymentKey ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Enter API key"
                      value={apiKeys.paymentGatewayApiKey}
                      onChange={(e) => setApiKeys((k) => ({ ...k, paymentGatewayApiKey: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="settings-eye-btn"
                      onClick={() => setShowPaymentKey((s) => !s)}
                      aria-label={showPaymentKey ? 'Hide key' : 'Show key'}
                      title={showPaymentKey ? 'Hide' : 'Show'}
                    >
                      {showPaymentKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button className="btn-save" onClick={handleSaveApiKeys} disabled={saveLoading}>
                  {saveLoading ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                  Save Changes
                </button>
              </div>
            </div>
          )}



          {activeTab === 'security' && (
            <div className="settings-section">
              <h2>Security Settings</h2>
              <div className="settings-form">
                <div className="form-group">
                  <label>Session Timeout (minutes)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={security.sessionTimeoutMinutes}
                    onChange={(e) => setSecurity((s) => ({ ...s, sessionTimeoutMinutes: Number(e.target.value) || 30 }))}
                  />
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={security.requireTwoFactor}
                      onChange={(e) => setSecurity((s) => ({ ...s, requireTwoFactor: e.target.checked }))}
                    />
                    Require Two-Factor Authentication
                  </label>
                </div>
                <button className="btn-save" onClick={handleSaveSecurity} disabled={saveLoading}>
                  {saveLoading ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'admin-users' && (
            <div className="settings-section">
              <div className="permissions-header">
                <div>
                  <h2>Admin Users</h2>
                  <p className="permissions-subtitle">Create new admin accounts and assign roles</p>
                </div>
                <button className="btn-save" onClick={() => { setAddAdminModal(true); setAddAdminError('') }}>
                  <UserPlus size={18} /> Add Admin User
                </button>
              </div>

              {/* Add Admin Modal */}
              {addAdminModal && (
                <div className="modal-overlay" onClick={() => setAddAdminModal(false)}>
                  <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2 className="modal-title">Create Admin User</h2>
                      <button className="modal-close-btn" onClick={() => setAddAdminModal(false)}><X size={22} /></button>
                    </div>
                    <div className="modal-body">
                      {addAdminError && <p className="settings-message settings-message--error">{addAdminError}</p>}
                      <div className="form-group">
                        <label>Full Name *</label>
                        <input type="text" className="form-input" placeholder="e.g. Ali Khan"
                          value={newAdmin.fullName}
                          onChange={(e) => setNewAdmin((a) => ({ ...a, fullName: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Email *</label>
                        <input type="email" className="form-input" placeholder="admin@example.com"
                          value={newAdmin.email}
                          onChange={(e) => setNewAdmin((a) => ({ ...a, email: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Phone</label>
                        <input type="text" className="form-input" placeholder="+966500000000"
                          value={newAdmin.phone}
                          onChange={(e) => setNewAdmin((a) => ({ ...a, phone: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Password *</label>
                        <div className="settings-input-with-eye">
                          <input type={showAdminPassword ? 'text' : 'password'} className="form-input" placeholder="Strong@123"
                            value={newAdmin.password}
                            onChange={(e) => setNewAdmin((a) => ({ ...a, password: e.target.value }))} />
                          <button type="button" className="settings-eye-btn" onClick={() => setShowAdminPassword((s) => !s)}>
                            {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Role *</label>
                        <select className="form-select" value={newAdmin.adminRole}
                          onChange={(e) => setNewAdmin((a) => ({ ...a, adminRole: e.target.value }))}>
                          <option value="">— Select a role —</option>
                          {allRoles.map((r) => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Department</label>
                        <input type="text" className="form-input" placeholder="e.g. Operations"
                          value={newAdmin.department}
                          onChange={(e) => setNewAdmin((a) => ({ ...a, department: e.target.value }))} />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button className="btn-action-secondary" onClick={() => setAddAdminModal(false)}>Cancel</button>
                      <button className="btn-action-primary" onClick={handleAddAdmin} disabled={addAdminLoading}>
                        {addAdminLoading ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />}
                        Create Admin
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="settings-section">
              <div className="permissions-header">
                <div>
                  <h2>Roles Management</h2>
                  <p className="permissions-subtitle">Create roles and manage role assignments per user</p>
                </div>
                <button className="btn-save" onClick={() => { setCreateRoleModal(true); setCreateRoleError('') }}>
                  <Plus size={18} /> Create Role
                </button>
              </div>

              {/* All Roles List */}
              <div className="roles-list-section">
                <h3 className="permissions-section-title">Available Roles</h3>
                {rolesListLoading ? (
                  <div className="settings-loading"><Loader2 size={20} className="spin" /> Loading roles…</div>
                ) : allRoles.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No roles found. Create one above.</p>
                ) : (
                  <div className="roles-grid">
                    {allRoles.map((role) => (
                      <div key={role.id ?? role.name} className="role-card">
                        <div className="role-card-name">{role.name}</div>
                        {role.description && <div className="role-card-desc">{role.description}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* User Role Assignment */}
              <div className="roles-list-section" style={{ marginTop: '2rem' }}>
                <h3 className="permissions-section-title">User Role Assignment</h3>

                {/* Search Box */}
                <div style={{ position: 'relative', maxWidth: '420px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '36px' }}
                      placeholder="Search user by name or email…"
                      value={userSearch}
                      onChange={(e) => handleUserSearch(e.target.value)}
                    />
                    {userSearch && (
                      <button style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px' }}
                        onClick={() => { setUserSearch(''); setUserSearchResults([]); setSelectedUser(null); setSelectedUserRoles([]) }}>
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {/* Search Dropdown */}
                  {(userSearchLoading || userSearchResults.length > 0) && (
                    <div className="user-search-dropdown">
                      {userSearchLoading ? (
                        <div className="user-search-item" style={{ color: '#9ca3af' }}><Loader2 size={14} className="spin" /> Searching…</div>
                      ) : (
                        userSearchResults.map((u) => (
                          <button key={u.id} className="user-search-item" onClick={() => handleSelectUser(u)}>
                            <div className="user-search-avatar">{(u.name ?? u.full_name ?? u.email ?? '?')[0].toUpperCase()}</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '13px' }}>{u.name ?? u.full_name ?? '—'}</div>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>{u.email}</div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Selected User Panel */}
                {selectedUser && (
                  <div className="selected-user-panel">
                    <div className="selected-user-info">
                      <div className="user-search-avatar" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                        {(selectedUser.name ?? selectedUser.full_name ?? selectedUser.email ?? '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{selectedUser.name ?? selectedUser.full_name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{selectedUser.email}</div>
                      </div>
                      <button className="btn-save" style={{ marginLeft: 'auto' }}
                        onClick={() => setAssignModal({ open: true, userId: selectedUser.id, roleId: '', loading: false, error: '' })}>
                        <Plus size={15} /> Assign Role
                      </button>
                    </div>

                    {selectedUserRolesLoading ? (
                      <div style={{ padding: '12px', color: '#9ca3af', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Loader2 size={16} className="spin" /> Loading roles…
                      </div>
                    ) : selectedUserRoles.length === 0 ? (
                      <p style={{ color: '#9ca3af', fontSize: '13px', margin: '12px 0 0' }}>No roles assigned to this user.</p>
                    ) : (
                      <table className="permissions-table" style={{ marginTop: '12px' }}>
                        <thead>
                          <tr>
                            <th>Role</th>
                            <th>Description</th>
                            <th style={{ width: '90px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedUserRoles.map((r) => (
                            <tr key={r.id ?? r.roleId ?? r.name}>
                              <td><strong>{r.name ?? r.roleName}</strong></td>
                              <td style={{ color: '#6b7280', fontSize: '13px' }}>{r.description ?? '—'}</td>
                              <td>
                                <button className="action-link disable" style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => handleRemoveRole(selectedUser.id, r.id ?? r.roleId)}>
                                  <Trash2 size={13} /> Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>

              {/* Create Role Modal */}
              {createRoleModal && (
                <div className="modal-overlay" onClick={() => setCreateRoleModal(false)}>
                  <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2 className="modal-title">Create New Role</h2>
                      <button className="modal-close-btn" onClick={() => setCreateRoleModal(false)}><X size={22} /></button>
                    </div>
                    <div className="modal-body">
                      {createRoleError && <p className="settings-message settings-message--error">{createRoleError}</p>}
                      <div className="form-group">
                        <label>Role Name *</label>
                        <input type="text" className="form-input" placeholder="e.g. FINANCE_MANAGER"
                          value={newRole.name}
                          onChange={(e) => setNewRole((r) => ({ ...r, name: e.target.value }))} />
                        <span className="form-hint">Will be saved in uppercase</span>
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <input type="text" className="form-input" placeholder="Brief description of this role"
                          value={newRole.description}
                          onChange={(e) => setNewRole((r) => ({ ...r, description: e.target.value }))} />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button className="btn-action-secondary" onClick={() => setCreateRoleModal(false)}>Cancel</button>
                      <button className="btn-action-primary" onClick={handleCreateRole} disabled={createRoleLoading}>
                        {createRoleLoading ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                        Create Role
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Assign Role Modal */}
              {assignModal.open && (
                <div className="modal-overlay" onClick={() => setAssignModal((s) => ({ ...s, open: false }))}>
                  <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2 className="modal-title">Assign Role</h2>
                      <button className="modal-close-btn" onClick={() => setAssignModal((s) => ({ ...s, open: false }))}><X size={22} /></button>
                    </div>
                    <div className="modal-body">
                      {assignModal.error && <p className="settings-message settings-message--error">{assignModal.error}</p>}
                      <div className="form-group">
                        <label>Select Role</label>
                        <select className="form-select" value={assignModal.roleId}
                          onChange={(e) => setAssignModal((s) => ({ ...s, roleId: e.target.value }))}>
                          <option value="">— Select a role —</option>
                          {allRoles.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button className="btn-action-secondary" onClick={() => setAssignModal((s) => ({ ...s, open: false }))}>Cancel</button>
                      <button className="btn-action-primary" onClick={handleAssignRole} disabled={assignModal.loading || !assignModal.roleId}>
                        {assignModal.loading ? <Loader2 size={16} className="spin" /> : null}
                        Assign
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="settings-section">
              <div className="permissions-header">
                <div>
                  <h2>Role-Based Permissions</h2>
                  <p className="permissions-subtitle">Create permissions, select a role, tick the permissions, then save</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-action-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={handleSeedPermissions} disabled={seedLoading}>
                    {seedLoading ? <Loader2 size={18} className="spin" /> : <CheckCircle size={18} />}
                    Seed All Permissions
                  </button>
                  <button className="btn-action-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => { setCreatePermModal(true); setCreatePermError('') }}>
                    <Plus size={18} /> Create Permission
                  </button>
                  <button
                    className="btn-save"
                    onClick={handleSaveRolePermissions}
                    disabled={permsSaving || !selectedRoleForPerms}
                  >
                    {permsSaving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                    Save Permissions
                  </button>
                </div>
              </div>

              {/* Create Permission Modal */}
              {createPermModal && (
                <div className="modal-overlay" onClick={() => setCreatePermModal(false)}>
                  <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2 className="modal-title">Create Permission</h2>
                      <button className="modal-close-btn" onClick={() => setCreatePermModal(false)}><X size={22} /></button>
                    </div>
                    <div className="modal-body">
                      {createPermError && <p className="settings-message settings-message--error">{createPermError}</p>}
                      <div className="form-group">
                        <label>Quick Select</label>
                        <select className="form-select"
                          value=""
                          onChange={(e) => {
                            const preset = PREDEFINED_PERMISSIONS.find(p => p.slug === e.target.value)
                            if (preset) setNewPerm({ name: preset.name, slug: preset.slug, description: preset.description })
                          }}>
                          <option value="">— Select a predefined permission —</option>
                          {PREDEFINED_PERMISSIONS.map((p) => (
                            <option key={p.slug} value={p.slug}>{p.name} ({p.slug})</option>
                          ))}
                        </select>
                        <span className="form-hint">Selecting auto-fills the fields below. You can also type custom values.</span>
                      </div>
                      <div className="form-group">
                        <label>Name *</label>
                        <input type="text" className="form-input" placeholder="e.g. Orders View"
                          value={newPerm.name}
                          onChange={(e) => setNewPerm((p) => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Slug *</label>
                        <input type="text" className="form-input" placeholder="e.g. orders.view"
                          value={newPerm.slug}
                          onChange={(e) => setNewPerm((p) => ({ ...p, slug: e.target.value }))} />
                        <span className="form-hint">Unique identifier, lowercase with dots</span>
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <input type="text" className="form-input" placeholder="Allows viewing orders"
                          value={newPerm.description}
                          onChange={(e) => setNewPerm((p) => ({ ...p, description: e.target.value }))} />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button className="btn-action-secondary" onClick={() => setCreatePermModal(false)}>Cancel</button>
                      <button className="btn-action-primary" onClick={handleCreatePermission} disabled={createPermLoading}>
                        {createPermLoading ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                        Create
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {permsError && <p className="settings-message settings-message--error">{permsError}</p>}
              {permsSuccess && <p className="settings-message settings-message--success">Permissions saved successfully!</p>}
              {seedResult && (
                <p className="settings-message settings-message--success">
                  Seed complete — Created: <strong>{seedResult.created}</strong>, Already existed: <strong>{seedResult.skipped}</strong>{seedResult.failed > 0 ? `, Failed: ${seedResult.failed}` : ''}
                </p>
              )}

              {/* Role Selector */}
              <div className="form-group" style={{ maxWidth: '360px', marginBottom: '1.5rem' }}>
                <label>Select Role</label>
                <select
                  className="form-select"
                  value={selectedRoleForPerms}
                  onChange={(e) => handleRoleForPermsChange(e.target.value)}
                >
                  <option value="">— Select a role —</option>
                  {allRoles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Permissions List */}
              {selectedRoleForPerms && (
                rolePermsLoading || permsLoading ? (
                  <div className="settings-loading"><Loader2 size={20} className="spin" /> Loading permissions…</div>
                ) : allPermissions.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    No permissions found. Create permissions first from the backend.
                  </p>
                ) : (
                  <div className="permissions-content">
                    <div className="permissions-section">
                      <div className="permissions-table-wrapper">
                        <table className="permissions-table">
                          <thead>
                            <tr>
                              <th style={{ width: '48px' }}>Access</th>
                              <th>Permission</th>
                              <th>Slug</th>
                              <th>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allPermissions.map((perm) => {
                              const id = perm.id ?? perm._id
                              const checked = checkedPermIds.has(id)
                              return (
                                <tr key={id}>
                                  <td className="permissions-role-cell">
                                    <label className="permission-checkbox-label">
                                      <input
                                        type="checkbox"
                                        className="permission-checkbox"
                                        checked={checked}
                                        onChange={() => togglePerm(id)}
                                      />
                                      <span className={`permission-indicator ${checked ? 'allowed' : 'denied'}`}>
                                        {checked ? '✓' : '✗'}
                                      </span>
                                    </label>
                                  </td>
                                  <td className="permissions-page-cell"><span className="page-name">{perm.name}</span></td>
                                  <td><code style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{perm.slug}</code></td>
                                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{perm.description ?? '—'}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => { setShowSuccessModal(false); setSaveError(''); setSettingsError(''); }}>
          <div className="modal-content success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-modal-content">
              <div className="success-icon-wrapper">
                <CheckCircle size={48} />
              </div>
              <h3 className="success-title">Settings Saved</h3>
              <p className="success-message">Your changes have been saved successfully.</p>
              <button className="btn-success-close" onClick={() => { setShowSuccessModal(false); setSaveError(''); setSettingsError(''); }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings

