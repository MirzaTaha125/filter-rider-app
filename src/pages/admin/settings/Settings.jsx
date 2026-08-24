import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Save, Key, Globe, Shield, Users, CheckCircle, Loader2, Eye, EyeOff, Plus, UserPlus } from 'lucide-react'
import { getRoles, getUsers, getSettings, createSetting, updateSetting, saveGoogleMapsKeyToBackend, getPermissions, createPermission, getRolePermissions, setRolePermissions } from '../../../api'
import { useAppSettings } from '../../../contexts/AppSettingsContext'
import { PREDEFINED_PERMISSIONS, PERMISSION_GROUPS } from './permissionCatalog'
import './Settings.css'

const TABS = ['general', 'api', 'security', 'admin-users', 'roles', 'permissions']

/** Up to two letters for the avatar, falling back to the email. */
function initials(name, email) {
  const source = (name && name !== '—' ? name : email) ?? ''
  const parts = source.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}


function Settings() {
  const navigate = useNavigate()
  // Tab lives in the URL so the create/edit pages can return to the right one.
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab = TABS.includes(tabParam) ? tabParam : 'general'
  const setActiveTab = (tab) => setSearchParams(
    tab === 'general' ? {} : { tab },
    { replace: true },
  )

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
  const [rolesError, setRolesError] = useState('')

  // Admin Users tab — everyone holding a role other than CUSTOMER/PROVIDER
  const [adminUsers, setAdminUsers] = useState([])
  const [adminUsersLoading, setAdminUsersLoading] = useState(false)
  const [adminUsersError, setAdminUsersError] = useState('')

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

  // Seed permissions state
  const [seedLoading, setSeedLoading] = useState(false)
  const [seedResult, setSeedResult] = useState(null) // { created, skipped, failed }

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

  const loadPermissionsTab = useCallback(() => {
    setPermsLoading(true)
    setPermsError('')
    return getPermissions()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data ?? data?.permissions ?? [])
        setAllPermissions(Array.isArray(list) ? list : [])
      })
      .catch((e) => setPermsError(e.message || 'Failed to load permissions'))
      .finally(() => setPermsLoading(false))
  }, [])

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

  const toggleGroup = (ids, turnOn) => {
    setCheckedPermIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => (turnOn ? next.add(id) : next.delete(id)))
      return next
    })
  }

  /**
   * The API returns a flat list, so rows are bucketed against the catalog to
   * keep 80 checkboxes navigable. Anything the catalog does not know about
   * (a hand-made permission, or one left over from an older catalog) falls
   * into "Other" rather than disappearing.
   */
  const groupedPermissions = useMemo(() => {
    const bySlug = new Map(allPermissions.map((p) => [p.slug, p]))
    const used = new Set()

    const groups = PERMISSION_GROUPS.map(({ group, permissions }) => ({
      group,
      permissions: permissions
        .map((catalogEntry) => {
          const match = bySlug.get(catalogEntry.slug)
          if (match) used.add(match.slug)
          return match
        })
        .filter(Boolean),
    })).filter((g) => g.permissions.length > 0)

    const other = allPermissions.filter((p) => !used.has(p.slug))
    return other.length > 0 ? [...groups, { group: 'Other', permissions: other }] : groups
  }, [allPermissions])

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

  const loadAllRoles = useCallback(() => {
    setRolesListLoading(true)
    setRolesError('')
    return getRoles()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data ?? data?.roles ?? [])
        setAllRoles(Array.isArray(list) ? list : [])
      })
      .catch((e) => setRolesError(e.message || 'Failed to load roles'))
      .finally(() => setRolesListLoading(false))
  }, [])

  const loadAdminUsers = useCallback(() => {
    setAdminUsersLoading(true)
    setAdminUsersError('')
    return getUsers({ audience: 'admin', limit: 100 })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data ?? data?.users ?? [])
        setAdminUsers(Array.isArray(list) ? list : [])
      })
      .catch((e) => setAdminUsersError(e.message || 'Failed to load admin users'))
      .finally(() => setAdminUsersLoading(false))
  }, [])

  // Tab data is loaded from the URL-driven tab, so returning from one of the
  // create pages (?tab=roles) refetches instead of showing a stale empty list.
  useEffect(() => {
    if (activeTab === 'roles' || activeTab === 'permissions') {
      void loadAllRoles()
    }
    if (activeTab === 'permissions') {
      void loadPermissionsTab()
    }
    if (activeTab === 'admin-users') {
      void loadAdminUsers()
    }
  }, [activeTab, loadAllRoles, loadPermissionsTab, loadAdminUsers])

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
          <button className={`settings-tab ${activeTab === 'admin-users' ? 'active' : ''}`} onClick={() => setActiveTab('admin-users')}>
            <UserPlus size={18} />
            Admin Users
          </button>
          <button className={`settings-tab ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}>
            <Users size={18} />
            Roles
          </button>
          <button className={`settings-tab ${activeTab === 'permissions' ? 'active' : ''}`} onClick={() => setActiveTab('permissions')}>
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
                  <p className="permissions-subtitle">
                    Everyone holding a role other than CUSTOMER or PROVIDER.
                    Only a SUPER_ADMIN can create another SUPER_ADMIN.
                  </p>
                </div>
                <button className="btn-save" onClick={() => navigate('/admin/settings/admin-users/new')}>
                  <UserPlus size={18} /> Add Admin User
                </button>
              </div>

              {adminUsersError && (
                <p className="settings-message settings-message--error">{adminUsersError}</p>
              )}

              {adminUsersLoading ? (
                <div className="settings-loading"><Loader2 size={20} className="spin" /> Loading admin users…</div>
              ) : adminUsers.length === 0 ? (
                <div className="au-empty">
                  <Users size={28} />
                  <p>No admin users yet</p>
                  <span>Create one to give a teammate access to this panel.</span>
                </div>
              ) : (
                <>
                  <div className="au-count">
                    {adminUsers.length} {adminUsers.length === 1 ? 'account' : 'accounts'}
                  </div>
                  <div className="au-table-wrapper">
                    <table className="au-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Roles</th>
                          <th>Status</th>
                          <th className="au-col-action">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsers.map((u) => {
                          const name = u.name ?? u.full_name ?? '—'
                          const status = (u.status ?? '').toLowerCase()
                          return (
                            <tr key={u.id}>
                              <td>
                                <div className="au-user-cell">
                                  <div className="au-avatar">{initials(name, u.email)}</div>
                                  <div className="au-user-info">
                                    <span className="au-user-name">{name}</span>
                                    <span className="au-user-email">{u.email ?? '—'}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="au-roles">
                                  {(u.roles ?? []).length === 0
                                    ? <span className="au-muted">No roles</span>
                                    : u.roles.map((r) => (
                                      <span
                                        key={r.id ?? r.name}
                                        className={`au-chip ${r.name === 'SUPER_ADMIN' ? 'au-chip--primary' : ''}`}
                                      >
                                        {r.name}
                                      </span>
                                    ))}
                                </div>
                              </td>
                              <td>
                                <span className={`au-status au-status--${status || 'unknown'}`}>
                                  {u.status ?? '—'}
                                </span>
                              </td>
                              <td className="au-col-action">
                                <button
                                  className="au-action-btn"
                                  onClick={() => navigate(`/admin/settings/roles/users/${u.id}?from=admin-users`)}
                                >
                                  Manage roles
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
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
                <button className="btn-save" onClick={() => navigate('/admin/settings/roles/new')}>
                  <Plus size={18} /> Create Role
                </button>
              </div>

              {rolesError && <p className="settings-message settings-message--error">{rolesError}</p>}

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
                    onClick={() => navigate('/admin/settings/permissions/new')}>
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
                            {groupedPermissions.map(({ group, permissions }) => {
                              const ids = permissions.map((p) => p.id ?? p._id)
                              const allOn = ids.every((id) => checkedPermIds.has(id))
                              return (
                                <Fragment key={group}>
                                  <tr className="perm-group-row">
                                    <td colSpan={4}>
                                      <label className="perm-group-label">
                                        <input
                                          type="checkbox"
                                          className="permission-checkbox"
                                          checked={allOn}
                                          onChange={() => toggleGroup(ids, !allOn)}
                                        />
                                        <span>{group}</span>
                                        <span className="perm-group-count">
                                          {ids.filter((id) => checkedPermIds.has(id)).length}/{ids.length}
                                        </span>
                                      </label>
                                    </td>
                                  </tr>
                                  {permissions.map((perm) => {
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
                                </Fragment>
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

