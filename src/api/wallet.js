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
export async function getWalletLedger({
  type,
  ownerType,
  order_id,
  search,
  customerId,
  providerId,
  page = 1,
  limit = 20,
} = {}) {
  const params = new URLSearchParams({ page, limit });
  if (type) params.set('type', type);
  if (ownerType) params.set('owner_type', ownerType);
  if (order_id) params.set('order_id', order_id);
  if (search) params.set('search', search);
  if (customerId) params.set('customer_id', customerId);
  if (providerId) params.set('provider_id', providerId);
  return apiRequest(`/admin/wallet/ledger?${params}`);
}

/** GET /admin/wallet/platform */
export async function getPlatformWallet() {
  return apiRequest('/admin/wallet/platform');
}

/**
 * POST /admin/wallet/topups
 * Manual admin credit to a customer or provider wallet (ledger ADJUSTMENT).
 * @param {{ owner_type: 'CUSTOMER' | 'PROVIDER', owner_id: string, amount: number, reason: string }} body
 */
export async function adminWalletTopup(body) {
  return apiRequest('/admin/wallet/topups', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** GET /admin/penalties */
export async function getPenalties({ status, search, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  return apiRequest(`/admin/penalties?${params}`);
}

/** GET /admin/penalties/:id */
export async function getPenalty(id) {
  return apiRequest(`/admin/penalties/${id}`);
}

/** GET /admin/penalties/completed-orders */
export async function searchCompletedOrdersForPenalty(search = '') {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const q = params.toString();
  return apiRequest(`/admin/penalties/completed-orders${q ? `?${q}` : ''}`);
}

/** POST /admin/penalties */
export async function createPenalty(body) {
  return apiRequest('/admin/penalties', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** PUT /admin/penalties/:id/approve */
export async function approvePenalty(id) {
  return apiRequest(`/admin/penalties/${id}/approve`, { method: 'PUT', body: '{}' });
}

/** PUT /admin/penalties/:id/waive */
export async function waivePenalty(id, notes = '') {
  return apiRequest(`/admin/penalties/${id}/waive`, {
    method: 'PUT',
    body: JSON.stringify({ notes }),
  });
}

/** GET /admin/configs/wallet-rules */
export async function getWalletRules() {
  return apiRequest('/admin/configs/wallet-rules');
}

/** PUT /admin/configs/wallet-rules */
export async function updateWalletRules(body) {
  return apiRequest('/admin/configs/wallet-rules', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
