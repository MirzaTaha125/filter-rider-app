import { apiRequest } from './client.js';

export async function getVehicleTypes() {
    const data = await apiRequest('/admin/vehicle-types');
    return data?.data ?? data;
}

export async function getVehicleType(id) {
    const data = await apiRequest(`/admin/vehicle-types/${id}`);
    return data?.data ?? data;
}

export async function createVehicleType(payload) {
    const data = await apiRequest('/admin/vehicle-types', {
        method: 'POST',
        body: JSON.stringify({
            name: payload.name,
            name_ar: payload.name_ar,
            image_url: payload.image_url || null,
            vehicle_size_id: payload.vehicle_size_id,
            display_order: payload.display_order,
            is_active: payload.is_active,
        }),
    });
    return data?.data ?? data;
}

export async function updateVehicleType(id, payload) {
    const data = await apiRequest(`/admin/vehicle-types/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
            name: payload.name,
            name_ar: payload.name_ar,
            image_url: payload.image_url || null,
            vehicle_size_id: payload.vehicle_size_id,
            display_order: payload.display_order,
            is_active: payload.is_active,
        }),
    });
    return data?.data ?? data;
}

export async function setVehicleTypeStatus(id, isActive) {
    const data = await apiRequest(`/admin/vehicle-types/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive }),
    });
    return data?.data ?? data;
}
