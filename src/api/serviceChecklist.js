import { apiRequest } from './client.js';

// The checklist belongs to the service (it used to belong to service types).

export async function getServiceChecklist(serviceId) {
    return apiRequest(`/admin/services/${serviceId}/checklist`);
}

export async function createServiceChecklistItem(serviceId, title, titleAr) {
    return apiRequest(`/admin/services/${serviceId}/checklist`, {
        method: 'POST',
        body: JSON.stringify({ title, title_ar: titleAr }),
    });
}

export async function updateServiceChecklistItem(itemId, payload) {
    return apiRequest(`/admin/services/checklist/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
}

export async function toggleServiceChecklistItem(itemId, isActive) {
    return apiRequest(`/admin/services/checklist/${itemId}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ is_active: isActive }),
    });
}

export async function deleteServiceChecklistItem(itemId) {
    return apiRequest(`/admin/services/checklist/${itemId}`, {
        method: 'DELETE',
    });
}
