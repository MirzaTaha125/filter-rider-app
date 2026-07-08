import { apiRequest } from './client.js';

/**
 * Admin Settings API
 * Used by: Settings page. Google Maps key is stored on backend via POST /admin/settings.
 */

/** GET – Fetch all admin settings */
export async function getSettings() {
  return apiRequest('/admin/settings');
}

/** GET – Fetch single setting by id (GET /admin/settings/{id}) */
export async function getSettingById(id) {
  return apiRequest(`/admin/settings/${id}`);
}

const GOOGLE_MAPS_KEY = 'google_maps_server_key';

/**
 * Get Google Maps API key from backend settings list.
 */
export async function getGoogleMapsKeyFromSettings() {
  const list = await getSettings();
  const arr = Array.isArray(list) ? list : (list?.data ?? []);
  const setting = arr.find((s) => s?.key === GOOGLE_MAPS_KEY);
  return setting?.value ?? null;
}

/**
 * POST – Create/update a setting (admin)
 * Swagger: POST /api/v1/admin/settings
 * Body: { key, value, type, description, is_active }
 */
export async function createSetting(payload) {
  return apiRequest('/admin/settings', {
    method: 'POST',
    body: JSON.stringify({
      key: payload.key,
      value: payload.value,
      type: payload.type ?? 'SECRET',
      description: payload.description ?? '',
      is_active: payload.isActive !== false,
    }),
  });
}

/** Create or update Google Maps API key on backend. On 409 "key already exists", GET list and PATCH by id. */
export async function saveGoogleMapsKeyToBackend(apiKey) {
  const payload = {
    key: GOOGLE_MAPS_KEY,
    value: apiKey || '',
    type: 'SECRET',
    description: 'Used by backend for maps geocoding/routes',
    is_active: true,
  };
  try {
    return await createSetting(payload);
  } catch (err) {
    const isConflict = err?.status === 409 || err?.data?.statusCode === 409 || err?.message?.toLowerCase().includes('already exists');
    if (!isConflict) throw err;
    const list = await getSettings();
    const arr = Array.isArray(list) ? list : list?.data ?? [];
    const existing = arr.find((s) => (s?.key ?? s?.name) === GOOGLE_MAPS_KEY);
    if (!existing?.id) throw new Error('Setting key exists but could not find id to update');
    return updateSetting(existing.id, { value: payload.value, is_active: true });
  }
}

/** DELETE – Delete a setting by id */
export async function deleteSetting(id) {
  return apiRequest(`/admin/settings/${id}`, { method: 'DELETE' });
}

/** PATCH – Update a single setting by id (Swagger: PATCH /admin/settings/{id}) */
export async function updateSetting(id, payload) {
  const body = {};
  if (payload.value != null) body.value = payload.value;
  if (payload.type != null) body.type = payload.type;
  if (payload.description != null) body.description = payload.description;
  if (payload.is_active != null) body.is_active = payload.is_active;
  return apiRequest(`/admin/settings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(Object.keys(body).length ? body : payload),
  });
}

/** PATCH – Update admin settings (partial payload) – legacy/flat settings if backend supports */
export async function updateSettings(payload) {
  const body = {};
  if (payload.platformName != null) body.platform_name = payload.platformName;
  if (payload.defaultLanguage != null) body.default_language = payload.defaultLanguage;
  if (payload.googleMapsApiKey != null) body.google_maps_api_key = payload.googleMapsApiKey;
  if (payload.paymentGatewayApiKey != null) body.payment_gateway_api_key = payload.paymentGatewayApiKey;
  if (payload.smsProvider != null) body.sms_provider = payload.smsProvider;
  if (payload.emailProvider != null) body.email_provider = payload.emailProvider;
  if (payload.pushNotificationsEnabled != null) body.push_notifications_enabled = payload.pushNotificationsEnabled;
  if (payload.emailNotificationsEnabled != null) body.email_notifications_enabled = payload.emailNotificationsEnabled;
  if (payload.sessionTimeoutMinutes != null) body.session_timeout_minutes = payload.sessionTimeoutMinutes;
  if (payload.requireTwoFactor != null) body.require_two_factor = payload.requireTwoFactor;
  return apiRequest('/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(Object.keys(body).length ? body : payload),
  });
}

/** GET – Fetch role-per-page permission matrix (if backend supports) */
export async function getPermissionMatrix() {
  return apiRequest('/admin/settings/permissions');
}

/** PATCH – Save role-per-page permissions */
export async function updatePermissionMatrix(permissions) {
  return apiRequest('/admin/settings/permissions', {
    method: 'PATCH',
    body: JSON.stringify({ permissions }),
  });
}
