import { apiRequest } from './client.js';

/**
 * List orders (admin)
 * Filters: status, serviceId, from, to
 */
export async function getAdminOrders(params = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'Any Status') query.append('status', params.status);
    if (params.serviceId && params.serviceId !== 'All Services') query.append('serviceId', params.serviceId);
    if (params.from) query.append('from', params.from);
    if (params.to) query.append('to', params.to);
    if (params.customerId)  query.append('customerId', params.customerId);
    if (params.providerId)  query.append('provider_id', params.providerId);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const queryString = query.toString();
    const url = `/admin/orders${queryString ? `?${queryString}` : ''}`;
    return apiRequest(url);
}

/**
 * Get order details (admin)
 */
export async function getAdminOrderDetails(id) {
    return apiRequest(`/admin/orders/${id}`);
}

/**
 * Cancel order (admin)
 */
export async function cancelOrder(id) {
    return apiRequest(`/admin/orders/${id}/cancel`, {
        method: 'POST',
    });
}

/**
 * Assign/Reassign order to provider (admin)
 */
export async function reassignOrder(id, providerId) {
    return apiRequest(`/admin/orders/${id}/reassign`, {
        method: 'POST',
        body: JSON.stringify({ provider_id: providerId }),
    });
}

/**
 * Force rebroadcast (admin)
 */
export async function rebroadcastOrder(id) {
    return apiRequest(`/admin/orders/${id}/rebroadcast`, {
        method: 'POST',
    });
}
