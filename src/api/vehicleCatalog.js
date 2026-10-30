import { apiRequest } from './client.js';

// Car makes + models for the customer "add vehicle" search.

export async function getVehicleMakes() {
    const data = await apiRequest('/admin/vehicle-catalog/makes');
    return data?.data ?? data;
}

export async function createVehicleMake(payload) {
    const data = await apiRequest('/admin/vehicle-catalog/makes', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return data?.data ?? data;
}

/** payload: any of { name, name_ar, display_order, is_active } */
export async function updateVehicleMake(id, payload) {
    const data = await apiRequest(`/admin/vehicle-catalog/makes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
    return data?.data ?? data;
}

export async function getVehicleModels({ makeId, q } = {}) {
    const params = new URLSearchParams();
    if (makeId) params.set('make_id', makeId);
    if (q) params.set('q', q);
    const query = params.toString();
    const data = await apiRequest(`/admin/vehicle-catalog/models${query ? `?${query}` : ''}`);
    return data?.data ?? data;
}

export async function createVehicleModel(payload) {
    const data = await apiRequest('/admin/vehicle-catalog/models', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return data?.data ?? data;
}

/** payload: any of { make_id, name, name_ar, vehicle_type_id, is_active } */
export async function updateVehicleModel(id, payload) {
    const data = await apiRequest(`/admin/vehicle-catalog/models/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
    return data?.data ?? data;
}

/** The same search the customer app uses. */
export async function searchVehicleCatalog(q, limit = 8) {
    const params = new URLSearchParams({ q, limit: String(limit) });
    const data = await apiRequest(`/vehicle-catalog/search?${params}`);
    return data?.data ?? data;
}
