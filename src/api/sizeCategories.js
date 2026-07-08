import { apiRequest } from './client.js';

export async function getSizeCategories() {
    const data = await apiRequest('/admin/size-categories');
    return data?.data ?? data;
}

export async function getSizeCategory(id) {
    const data = await apiRequest(`/admin/size-categories/${id}`);
    return data?.data ?? data;
}

export async function createSizeCategory(payload) {
    const data = await apiRequest('/admin/size-categories', {
        method: 'POST',
        body: JSON.stringify({
            name: payload.name,
            multiplier: payload.multiplier,
        }),
    });
    return data?.data ?? data;
}

export async function updateSizeCategory(id, payload) {
    const data = await apiRequest(`/admin/size-categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
            name: payload.name,
            multiplier: payload.multiplier,
        }),
    });
    return data?.data ?? data;
}

export async function deleteSizeCategory(id) {
    const data = await apiRequest(`/admin/size-categories/${id}`, {
        method: 'DELETE',
    });
    return data?.data ?? data;
}
