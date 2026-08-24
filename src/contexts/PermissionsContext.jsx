import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMyPermissions } from '../api/auth.js'

const PermissionsContext = createContext({
  userPermissions: new Set(),
  isSuperAdmin: false,
  hasPermission: () => false,
  loadingPermissions: true,
})

export function PermissionsProvider({ children }) {
  const [userPermissions, setUserPermissions] = useState(new Set())
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  // True when the API has no permission data to gate on (pre-/auth/permissions
  // backend). Distinct from isSuperAdmin so callers can tell them apart.
  const [gatingUnavailable, setGatingUnavailable] = useState(false)
  const [loadingPermissions, setLoadingPermissions] = useState(true)
  const [permissionsError, setPermissionsError] = useState('')

  const loadPermissions = useCallback(() => {
    setLoadingPermissions(true)
    setPermissionsError('')
    getMyPermissions()
      .then((data) => {
        // client.js already unwraps the response envelope, leaving
        // { message, data: { roles, is_super_admin, permissions } }
        const payload = data?.data ?? data ?? {}
        const list = Array.isArray(payload.permissions) ? payload.permissions : []
        setGatingUnavailable(false)
        setIsSuperAdmin(Boolean(payload.is_super_admin))
        setUserPermissions(
          new Set(list.map((p) => (typeof p === 'string' ? p : (p?.slug ?? ''))).filter(Boolean)),
        )
      })
      .catch((e) => {
        setUserPermissions(new Set())
        setIsSuperAdmin(false)

        // We only gate on permissions we actually received. If the request
        // could not be answered — server down (ERR_CONNECTION_REFUSED), an API
        // predating /auth/permissions (404), or a 5xx — we have no data to gate
        // on, and hiding the menu would just stack confusion on top of an
        // already-broken panel. Show it, and surface the warning below so this
        // never fails silently the way the old `catch(() => full access)` did.
        // No real access is granted either way: every request is still checked
        // server-side by JwtAuthGuard + RolesGuard.
        setGatingUnavailable(true)
        setPermissionsError(e?.message || 'Failed to load permissions')
      })
      .finally(() => setLoadingPermissions(false))
  }, [])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  const hasPermission = useCallback((slug) => {
    if (!slug) return true
    if (gatingUnavailable) return true
    if (isSuperAdmin) return true
    return userPermissions.has(slug)
  }, [userPermissions, isSuperAdmin, gatingUnavailable])

  return (
    <PermissionsContext.Provider value={{
      userPermissions,
      isSuperAdmin,
      gatingUnavailable,
      hasPermission,
      loadingPermissions,
      permissionsError,
      reloadPermissions: loadPermissions,
    }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext)
}
