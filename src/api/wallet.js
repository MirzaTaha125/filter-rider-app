import { apiRequest } from './client.js';

/** GET /admin/wallet/overview */
export async function getWalletOverview() {
  return apiRequest('/admin/wallet/overview');
}

/** GET /admin/wallet/payment-approvals */
export async function getPaymentApprovals({ status, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set('status', status);
  return apiRequest(`/admin/wallet/payment-approvals?${params}`);
}

/** GET /admin/wallet/payment-approvals/{id} */
export async function getPaymentApproval(id) {
  return apiRequest(`/admin/wallet/payment-approvals/${id}`);
}

/** POST /admin/wallet/payment-approvals/{id}/approve */
export async function approvePayment(id, adminNote = '') {
  return apiRequest(`/admin/wallet/payment-approvals/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ admin_note: adminNote }),
  });
}

/** POST /admin/wallet/payment-approvals/{id}/reject */
export async function rejectPayment(id, adminNote = '') {
  return apiRequest(`/admin/wallet/payment-approvals/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ admin_note: adminNote }),
  });
}

/** GET /admin/wallet/ledger */
export async function getWalletLedger({ type, order_id, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (type) params.set('type', type);
  if (order_id) params.set('order_id', order_id);
  return apiRequest(`/admin/wallet/ledger?${params}`);
}
