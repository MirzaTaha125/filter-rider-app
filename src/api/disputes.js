import { apiRequest } from './client.js';

/** GET /admin/disputes – List all disputes */
export async function getDisputes() {
  const data = await apiRequest('/admin/disputes');
  return Array.isArray(data) ? data : (data?.disputes ?? data?.items ?? []);
}

/** GET /admin/disputes/{id} – Get full dispute details including messages */
export async function getDispute(id) {
  return apiRequest(`/admin/disputes/${id}`);
}

/** PATCH /admin/disputes/{id}/status – Update dispute status */
export async function updateDisputeStatus(id, status) {
  return apiRequest(`/admin/disputes/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/** POST /admin/disputes/{id}/messages – Add admin message or internal note */
export async function addDisputeMessage(id, message, isInternalNote = false) {
  return apiRequest(`/admin/disputes/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, is_internal_note: isInternalNote }),
  });
}
