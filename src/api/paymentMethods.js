import { apiRequest } from './client.js';

/** GET /admin/payment-methods */
export async function listAdminPaymentMethods() {
  const data = await apiRequest('/admin/payment-methods');
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/** PATCH /admin/payment-methods/:id */
export async function updateAdminPaymentMethod(id, payload) {
  return apiRequest(`/admin/payment-methods/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
