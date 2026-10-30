import { apiRequest } from './client.js';

function toPayload(payload) {
    return JSON.stringify({
        name: payload.name,
        name_ar: payload.name_ar,
        code: payload.code,
        display_order: payload.display_order,
        is_active: payload.is_active,
    });
}

export async function getVehicleSizes() {
    const data = await apiRequest('/admin/vehicle-sizes');
    return data?.data ?? data;
}

export async function getVehicleSize(id) {
    const data = await apiRequest(`/admin/vehicle-sizes/${id}`);
    return data?.data ?? data;
}

export async function createVehicleSize(payload) {
    const data = await apiRequest('/admin/vehicle-sizes', {
        method: 'POST',
        body: toPayload(payload),
    });
    return data?.data ?? data;
}

export async function updateVehicleSize(id, payload) {
    const data = await apiRequest(`/admin/vehicle-sizes/${id}`, {
        method: 'PATCH',
        body: toPayload(payload),
    });
    return data?.data ?? data;
}

export async function setVehicleSizeStatus(id, isActive) {
    const data = await apiRequest(`/admin/vehicle-sizes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive }),
    });
    return data?.data ?? data;
}

export async function deleteVehicleSize(id) {
    const data = await apiRequest(`/admin/vehicle-sizes/${id}`, {
        method: 'DELETE',
    });
    return data?.data ?? data;
}
