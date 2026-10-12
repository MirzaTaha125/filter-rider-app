import { apiRequest } from './client.js';

function pageQuery(params = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    if (params.offset) query.append('offset', params.offset);
    const qs = query.toString();
    return qs ? `?${qs}` : '';
}

/**
 * GET /customers/{id}/filter-orders – Orders the customer placed at Filter
 * workshops (already copied into the Rider database), with totals.
 */
export async function getCustomerFilterOrders(customerId, params = {}) {
    return apiRequest(`/customers/${customerId}/filter-orders${pageQuery(params)}`);
}

/**
 * POST /customers/{id}/filter-orders/refresh – Pull the latest orders from
 * Filter right now (rate limited per customer), then return the list.
 */
export async function refreshCustomerFilterOrders(customerId, params = {}) {
    return apiRequest(`/customers/${customerId}/filter-orders/refresh${pageQuery(params)}`, {
        method: 'POST',
    });
}
