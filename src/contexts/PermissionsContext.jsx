import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getPermissions as fetchUserPermissions } from '../api/auth.js'

const PermissionsContext = createContext({ userPermissions: new Set(), hasPermission: () => true, loadingPermissions: true })

export function PermissionsProvider({ children }) {
  const [userPermissions, setUserPermissions] = useState(new Set())
  const [loadingPermissions, setLoadingPermissions] = useState(true)

  const loadPermissions = useCallback(() => {
    setLoadingPermissions(true)
    fetchUserPermissions()
      .then((data) => {
        // Response may be array of permission objects or slugs
        const list = Array.isArray(data) ? data : (data?.data ?? data?.permissions ?? [])
        const slugs = list.map((p) => (typeof p === 'string' ? p : (p.slug ?? p.name ?? '')))
        setUserPermissions(new Set(slugs))
      })
      .catch(() => {
        // If permissions endpoint fails (e.g. super-admin with no restrictions),
        // treat as full access by setting to null (checked in hasPermission)
        setUserPermissions(null)
      })
      .finally(() => setLoadingPermissions(false))
  }, [])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  // null means full access (permissions fetch failed or user is super-admin)
  const hasPermission = useCallback((slug) => {
    if (!slug) return true
    if (userPermissions === null) return true
    if (userPermissions.size === 0 && loadingPermissions) return true
    return userPermissions.has(slug)
  }, [userPermissions, loadingPermissions])

  return (
    <PermissionsContext.Provider value={{ userPermissions, hasPermission, loadingPermissions, reloadPermissions: loadPermissions }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext)
}
