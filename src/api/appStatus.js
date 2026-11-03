import { apiRequest } from './client.js';

/** GET /admin/app-status */
export async function getAppStatus() {
  return apiRequest('/admin/app-status');
}

/** PUT /admin/app-status */
export async function saveAppStatus(payload) {
  return apiRequest('/admin/app-status', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
