import { apiRequest } from './client.js';

/** GET /customers – List customers with filters */
export async function getCustomers(params = {}) {
    const query = new URLSearchParams();
    if (params.page)          query.append('page', params.page);
    if (params.limit)         query.append('limit', params.limit);
    if (params.search)        query.append('search', params.search);
    if (params.accountStatus && params.accountStatus !== 'All Status') {
        query.append('accountStatus', params.accountStatus);
    }
    if (params.walletRange)   query.append('walletRange', params.walletRange);

    const queryString = query.toString();
    return apiRequest(`/customers${queryString ? `?${queryString}` : ''}`);
}

/** GET /customers/{id} – Get customer details with order history */
export async function getCustomerDetails(id) {
    return apiRequest(`/customers/${id}`);
}

/** PATCH /customers/{id}/status – Enable or disable customer account */
export async function updateCustomerStatus(id, status) {
    return apiRequest(`/customers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
}
