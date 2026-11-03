import { apiRequest } from './client.js';

/**
 * GET /admin/workshop-offers – ERP workshop offers ("visit a Filter workshop")
 * with their ERP switch, Rider switch and current state.
 */
export async function getAdminWorkshopOffers() {
    return apiRequest('/admin/workshop-offers');
}

/**
 * PATCH /admin/workshop-offers/{id}/status – Show or hide a workshop offer in
 * the Rider app only. The ERP is not changed.
 */
export async function setWorkshopOfferActive(id, isActive) {
    return apiRequest(`/admin/workshop-offers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive }),
    });
}

/**
 * PATCH /admin/erp-promotions/{id}/status – Switch an ERP-managed promotion on
 * or off. The ERP marketing portal shows the same state.
 */
export async function setErpPromotionActive(id, isActive) {
    return apiRequest(`/admin/erp-promotions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive }),
    });
}
