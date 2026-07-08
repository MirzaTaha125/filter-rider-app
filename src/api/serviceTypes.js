import { apiRequest } from './client.js';

export async function getServiceTypes(serviceId = null) {
    const url = serviceId ? `/admin/service-types?serviceId=${serviceId}` : '/admin/service-types';
    return apiRequest(url);
}

export async function createServiceType(payload) {
    return apiRequest('/admin/service-types', {
        method: 'POST',
        body: JSON.stringify({
            service_id: payload.serviceId,
            name_en: payload.name,
            name_ar: payload.nameAr || payload.name,
            price_mode: payload.priceMode || 'DELTA',
            price_value: String(payload.priceValue || '0'),
            duration_min: payload.duration ? Number(payload.duration) : null,
            is_active: payload.isActive !== false,
        }),
    });
}

export async function updateServiceType(id, payload) {
    return apiRequest(`/admin/service-types/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
            name_en: payload.name,
            name_ar: payload.nameAr,
            price_mode: payload.priceMode,
            price_value: payload.priceValue !== undefined ? String(payload.priceValue) : undefined,
            duration_min: payload.duration !== undefined ? Number(payload.duration) : undefined,
            is_active: payload.isActive,
        }),
    });
}

// Checklist Items
export async function getChecklistItems(serviceTypeId) {
    return apiRequest(`/admin/service-types/${serviceTypeId}/checklist`);
}

export async function createChecklistItem(serviceTypeId, title, sortOrder = 0) {
    return apiRequest(`/admin/service-types/${serviceTypeId}/checklist`, {
        method: 'POST',
        body: JSON.stringify({
            title,
            sort_order: sortOrder,
            is_active: true,
        }),
    });
}

export async function updateChecklistItem(itemId, payload) {
    return apiRequest(`/admin/service-types/checklist/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({
            title: payload.title,
            sort_order: payload.sortOrder,
            is_active: payload.isActive,
        }),
    });
}

export async function deleteChecklistItem(itemId) {
    return apiRequest(`/admin/service-types/checklist/${itemId}`, {
        method: 'DELETE',
    });
}

export async function toggleChecklistItem(itemId, isActive) {
    return apiRequest(`/admin/service-types/checklist/${itemId}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ is_active: isActive }),
    });
}
