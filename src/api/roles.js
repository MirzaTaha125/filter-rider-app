import { apiRequest } from './client.js';

// ── Roles ────────────────────────────────────────────────────────────────────

/** GET /roles – List all roles */
export async function getRoles() {
  return apiRequest('/roles');
}

/** POST /roles – Create a new role */
export async function createRole(payload) {
  return apiRequest('/roles', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      description: payload.description,
    }),
  });
}

/** GET /roles/user/{userId} – Get roles assigned to a user */
export async function getUserRoles(userId) {
  return apiRequest(`/roles/user/${userId}`);
}

/** POST /roles/assign – Assign role to user by role ID */
export async function assignRole(userId, roleId) {
  return apiRequest('/roles/assign', {
    method: 'POST',
    body: JSON.stringify({ userId, roleId }),
  });
}

/** POST /roles/assign-by-name – Assign role to user by role name */
export async function assignRoleByName(userId, roleName) {
  return apiRequest('/roles/assign-by-name', {
    method: 'POST',
    body: JSON.stringify({ userId, roleName }),
  });
}

/** DELETE /roles/remove – Remove role from user */
export async function removeRole(userId, roleId) {
  return apiRequest('/roles/remove', {
    method: 'DELETE',
    body: JSON.stringify({ userId, roleId }),
  });
}

// ── Permissions ──────────────────────────────────────────────────────────────

/** GET /permissions – List all permissions */
export async function getPermissions() {
  return apiRequest('/permissions');
}

/** POST /permissions – Create a new permission */
export async function createPermission(payload) {
  return apiRequest('/permissions', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
    }),
  });
}

/** GET /permissions/role/{roleId} – Get permissions assigned to a role */
export async function getRolePermissions(roleId) {
  return apiRequest(`/permissions/role/${roleId}`);
}

/** PUT /permissions/role – Replace all permissions for a role */
export async function setRolePermissions(roleId, permissionIds) {
  return apiRequest('/permissions/role', {
    method: 'PUT',
    body: JSON.stringify({ roleId, permissionIds }),
  });
}
