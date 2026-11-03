import { apiRequest } from './client.js';

/**
 * Master catalog: the ERP (Filter) catalog as copied into Rider. Read-only;
 * services and categories can be copied into the Rider catalog ("Add from master catalog").
 */

/** GET /admin/master-catalog/summary – counts, departments, last sync time */
export async function getMasterCatalogSummary() {
    return apiRequest('/admin/master-catalog/summary');
}

/** GET /admin/master-catalog/items – products or services (kind, q, department_id, status, limit, offset) */
export async function getMasterCatalogItems(params = {}) {
    const query = new URLSearchParams();
    for (const key of ['kind', 'q', 'department_id', 'status', 'limit', 'offset']) {
        const value = params[key];
        if (value !== undefined && value !== null && value !== '') query.append(key, value);
    }
    const qs = query.toString();
    return apiRequest(`/admin/master-catalog/items${qs ? `?${qs}` : ''}`);
}

/** GET /admin/master-catalog/items/{id} – one item with its price per branch */
export async function getMasterCatalogItem(id) {
    return apiRequest(`/admin/master-catalog/items/${id}`);
}

/** GET /admin/master-catalog/workshops – workshops and branches with item counts */
export async function getMasterCatalogWorkshops() {
    return apiRequest('/admin/master-catalog/workshops');
}

/** GET /admin/master-catalog/categories – ERP categories (q, type, status) with item counts and the Rider category made from each */
export async function getMasterCatalogCategories(params = {}) {
    const query = new URLSearchParams();
    for (const key of ['q', 'type', 'status']) {
        const value = params[key];
        if (value !== undefined && value !== null && value !== '') query.append(key, value);
    }
    const qs = query.toString();
    return apiRequest(`/admin/master-catalog/categories${qs ? `?${qs}` : ''}`);
}

/**
 * POST /admin/master-catalog-import/services/{id} – adds a master catalog service as a
 * Rider service (same name and price). Its ERP category is added too unless
 * `category_id` (a Rider category) is given. Body: { category_id?, duration_min? }
 */
export async function importMasterCatalogService(id, body = {}) {
    return apiRequest(`/admin/master-catalog-import/services/${id}`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

/** POST /admin/master-catalog-import/categories/{id} – adds a master catalog category as a Rider category */
export async function importMasterCatalogCategory(id) {
    return apiRequest(`/admin/master-catalog-import/categories/${id}`, { method: 'POST', body: '{}' });
}
