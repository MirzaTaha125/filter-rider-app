import { describe, it, expect } from 'vitest'

/**
 * Pure hasPermission logic extracted for unit testing.
 * Mirrors the logic in PermissionsContext.jsx.
 */
function hasPermission(userPermissions, isSuperAdmin, slug, gatingUnavailable = false) {
  if (!slug) return true
  if (gatingUnavailable) return true
  if (isSuperAdmin) return true
  return userPermissions.has(slug)
}

describe('hasPermission', () => {
  it('returns true when slug is empty/null (no restriction)', () => {
    const perms = new Set(['orders.view'])
    expect(hasPermission(perms, false, '')).toBe(true)
    expect(hasPermission(perms, false, null)).toBe(true)
    expect(hasPermission(perms, false, undefined)).toBe(true)
  })

  it('grants everything to a super admin', () => {
    expect(hasPermission(new Set(), true, 'orders.view')).toBe(true)
    expect(hasPermission(new Set(), true, 'settings.manage')).toBe(true)
  })

  it('fails closed when the permissions fetch failed (empty set, not super admin)', () => {
    // Previously this returned true, which let any admin see every page in the
    // sidebar whenever GET /auth/permissions errored.
    expect(hasPermission(new Set(), false, 'wallet.view')).toBe(false)
    expect(hasPermission(new Set(), false, 'settings.manage')).toBe(false)
  })

  it('shows everything when permissions could not be fetched at all', () => {
    // Server down / 404 / 5xx: nothing to gate on, so hiding the menu would
    // lock out even a super admin. Backend guards still enforce real access,
    // and the sidebar shows a visible warning so it is never silent.
    expect(hasPermission(new Set(), false, 'wallet.view', true)).toBe(true)
    expect(hasPermission(new Set(), false, 'settings.manage', true)).toBe(true)
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
