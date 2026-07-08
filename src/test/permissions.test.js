import { describe, it, expect } from 'vitest'

/**
 * Pure hasPermission logic extracted for unit testing.
 * Mirrors the logic in PermissionsContext.jsx.
 */
function hasPermission(userPermissions, loadingPermissions, slug) {
  if (!slug) return true
  if (userPermissions === null) return true          // fetch failed = full access
  if (userPermissions.size === 0 && loadingPermissions) return true  // still loading
  return userPermissions.has(slug)
}

describe('hasPermission', () => {
  it('returns true when slug is empty/null (no restriction)', () => {
    const perms = new Set(['orders.view'])
    expect(hasPermission(perms, false, '')).toBe(true)
    expect(hasPermission(perms, false, null)).toBe(true)
    expect(hasPermission(perms, false, undefined)).toBe(true)
  })

  it('returns true when userPermissions is null (full access fallback)', () => {
    expect(hasPermission(null, false, 'orders.view')).toBe(true)
    expect(hasPermission(null, false, 'settings.manage')).toBe(true)
  })

  it('returns true while permissions are still loading (empty set + loading=true)', () => {
    expect(hasPermission(new Set(), true, 'wallet.view')).toBe(true)
  })

  it('returns false when loaded and permission is absent', () => {
    const perms = new Set(['orders.view', 'dashboard.view'])
    expect(hasPermission(perms, false, 'wallet.view')).toBe(false)
    expect(hasPermission(perms, false, 'settings.manage')).toBe(false)
  })

  it('returns true when loaded and permission is present', () => {
    const perms = new Set(['orders.view', 'wallet.view', 'settings.view'])
    expect(hasPermission(perms, false, 'orders.view')).toBe(true)
    expect(hasPermission(perms, false, 'wallet.view')).toBe(true)
  })

  it('is case-sensitive (slug must match exactly)', () => {
    const perms = new Set(['orders.view'])
    expect(hasPermission(perms, false, 'Orders.View')).toBe(false)
    expect(hasPermission(perms, false, 'ORDERS.VIEW')).toBe(false)
    expect(hasPermission(perms, false, 'orders.view')).toBe(true)
  })
})
