import { apiRequest, setAuthToken, setRefreshToken } from './client.js';

export async function login(email, password, deviceId = 'web', deviceType = 'WEB') {
  const data = await apiRequest('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: email,
      password,
      device_id: deviceId,
      device_type: deviceType,
    }),
  });

  // Unwrap nested data if response is { message, data: { access_token, ... } }
  const tokenData = data.data ?? data;
  const token = tokenData.access_token ?? tokenData.token ?? tokenData.accessToken;
  const refreshToken = tokenData.refresh_token ?? tokenData.refreshToken ?? tokenData.refresh;

  if (token) setAuthToken(token);
  if (refreshToken) setRefreshToken(refreshToken);

  return data;
}

export async function signupAdmin(payload) {
  return apiRequest('/admin/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      full_name: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      country_code: payload.countryCode || 'SA',
      password: payload.password,
      admin_role: payload.adminRole,
      department: payload.department || undefined,
      bio: payload.bio || undefined,
    }),
  });
}

export async function refreshToken(refresh_token) {
  return apiRequest('/admin/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token }),
  });
}

export function logout() {
  setAuthToken(null);
  setRefreshToken(null);
}

export async function forgotPassword(destination) {
  return apiRequest('/admin/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ destination, email: destination }),
  });
}

export async function resetPassword(destination, otp, newPassword) {
  return apiRequest('/admin/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      destination,
      otp,
      new_password: newPassword,
    }),
  });
}

// --- Auth: current user, permissions, sessions, security (Swagger: Authentication) ---

/** GET /auth/me – already used via getAdminProfile(); alias if needed */

/** GET /auth/permissions – Get user permissions */
export async function getPermissions() {
  return apiRequest('/auth/permissions');
}

/** GET /auth/sessions – List active sessions */
export async function getSessions() {
  return apiRequest('/auth/sessions');
}

/** POST /auth/sessions/revoke – Revoke a session */
export async function revokeSession(payload) {
  return apiRequest('/auth/sessions/revoke', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** GET /auth/login-attempts/failed – Get failed login attempts */
export async function getFailedLoginAttempts() {
  return apiRequest('/auth/login-attempts/failed');
}

/** GET /auth/login-history – Get login history */
export async function getLoginHistory() {
  return apiRequest('/auth/login-history');
}

/** POST /auth/user/status – Change user status (admin) */
export async function changeUserStatus(userId, status) {
  return apiRequest('/auth/user/status', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, status }),
  });
}

/** POST /auth/user/force-logout – Force logout user (admin) */
export async function forceLogoutUser(userId) {
  return apiRequest('/auth/user/force-logout', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}
