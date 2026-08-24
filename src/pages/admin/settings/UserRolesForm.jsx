import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, AlertTriangle, Plus, Trash2 } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import { getUser, getRoles, assignRole, removeRole } from '../../../api'
import '../adminForm.css'
import './SettingsForm.css'

function UserRolesForm() {
  const { userId } = useParams()
  const navigate = useNavigate()
  // Remember which tab sent us here so "Done" returns to it.
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from') === 'admin-users' ? 'admin-users' : 'roles'
  const BACK_TO = `/admin/settings?tab=${from}`

  const [user, setUser] = useState(null)
  const [userRoles, setUserRoles] = useState([])
  const [allRoles, setAllRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [roleToAssign, setRoleToAssign] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [removingId, setRemovingId] = useState('')
  const [actionError, setActionError] = useState('')

  const unwrap = (data, ...keys) => {
    if (Array.isArray(data)) return data
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key]
    }
    return []
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [userRes, rolesRes] = await Promise.all([getUser(userId), getRoles()])
      const userData = userRes?.data ?? userRes
      if (!userData?.id) {
        setLoadError('User not found')
        return
      }
      setUser(userData)
      setUserRoles(unwrap(userData.roles))
      setAllRoles(unwrap(rolesRes, 'data', 'roles'))
    } catch (err) {
      setLoadError(err.message || 'Failed to load user')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const assignedIds = new Set(userRoles.map((r) => r.id))
  const availableRoles = allRoles.filter((r) => !assignedIds.has(r.id))

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!roleToAssign) return
    setAssigning(true)
    setActionError('')
    try {
      await assignRole(userId, roleToAssign)
      setRoleToAssign('')
      await loadData()
    } catch (err) {
      setActionError(err.message || 'Failed to assign role')
    } finally {
      setAssigning(false)
    }
  }

  const handleRemove = async (role) => {
    setRemovingId(role.id)
    setActionError('')
    try {
      await removeRole(userId, role.id)
      setUserRoles((prev) => prev.filter((r) => r.id !== role.id))
    } catch (err) {
      setActionError(err.message || 'Failed to remove role')
    } finally {
      setRemovingId('')
    }
  }

  const displayName = user?.name ?? user?.full_name ?? user?.email ?? 'User'

  if (loading) {
    return (
      <div className="settings-form-page">
        <PageHeader title="User Roles" onBack={() => navigate(BACK_TO)} />
        <div className="sf-state"><Loader2 size={32} className="spin" /><span>Loading…</span></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="settings-form-page">
        <PageHeader title="User Roles" onBack={() => navigate(BACK_TO)} />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load user</h2>
          <p>{loadError}</p>
          <button className="sf-btn sf-btn--secondary" onClick={() => navigate(BACK_TO)}>
            Back to roles
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-form-page">
      <PageHeader
        title="Manage User Roles"
        subtitle={user?.email ?? displayName}
        onBack={() => navigate(BACK_TO)}
      />

      <div className="sf-form">
        {actionError && (
          <div className="sf-alert">
            <AlertTriangle size={16} />
            <span>{actionError}</span>
          </div>
        )}

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>{displayName}</h2>
            <p>
              {user?.email ?? '—'}
              {user?.status ? ` · ${user.status}` : ''}
            </p>
          </header>

          {userRoles.length === 0 ? (
            <p className="sfx-empty">No roles assigned to this user.</p>
          ) : (
            <div className="sfx-table-wrap">
              <table className="sfx-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Description</th>
                    <th className="sfx-col-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {userRoles.map((role) => (
                    <tr key={role.id}>
                      <td><strong>{role.name}</strong></td>
                      <td className="sfx-muted">{role.description ?? '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="sfx-btn-danger"
                          onClick={() => handleRemove(role)}
                          disabled={removingId === role.id}
                        >
                          {removingId === role.id
                            ? <Loader2 size={13} className="spin" />
                            : <Trash2 size={13} />}
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Assign a role</h2>
            <p>Granting SUPER_ADMIN requires you to be a SUPER_ADMIN yourself.</p>
          </header>

          <form className="sfx-assign-row" onSubmit={handleAssign}>
            <div className="sf-field">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                value={roleToAssign}
                onChange={(e) => setRoleToAssign(e.target.value)}
                disabled={assigning || availableRoles.length === 0}
              >
                <option value="">
                  {availableRoles.length === 0
                    ? 'All roles already assigned'
                    : '— Select a role —'}
                </option>
                {availableRoles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="sf-btn sf-btn--primary"
              disabled={assigning || !roleToAssign}
            >
              {assigning
                ? <><Loader2 size={16} className="spin" /> Assigning…</>
                : <><Plus size={16} /> Assign role</>}
            </button>
          </form>
        </section>

        <div className="sf-actions">
          <button
            type="button"
            className="sf-btn sf-btn--secondary"
            onClick={() => navigate(BACK_TO)}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserRolesForm
