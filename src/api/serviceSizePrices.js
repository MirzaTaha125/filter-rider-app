import { apiRequest } from './client.js';

/** One row per vehicle size: { vehicle_size_id, name, code, is_active, price, available }. */
export async function getServiceSizePrices(serviceId) {
    const data = await apiRequest(`/admin/services/${serviceId}/size-prices`);
    return data?.data ?? data;
}

/** prices: [{ vehicle_size_id, price }] — a null price clears that size (not offered for it). */
export async function setServiceSizePrices(serviceId, prices) {
    const data = await apiRequest(`/admin/services/${serviceId}/size-prices`, {
        method: 'PUT',
        body: JSON.stringify({ prices }),
    });
    return data?.data ?? data;
}

/** Same shape as the service size prices, for one add-on. */
export async function getServiceAddonSizePrices(addonId) {
    const data = await apiRequest(`/admin/service-addons/${addonId}/size-prices`);
    return data?.data ?? data;
}

export async function setServiceAddonSizePrices(addonId, prices) {
    const data = await apiRequest(`/admin/service-addons/${addonId}/size-prices`, {
        method: 'PUT',
        body: JSON.stringify({ prices }),
    });
    return data?.data ?? data;
}

/** Simulated price of a service for one vehicle size, with chosen add-ons. */
export async function getPriceQuote({ serviceId, vehicleSizeId, addonIds = [] }) {
    const params = new URLSearchParams({ service_id: serviceId, vehicle_size_id: vehicleSizeId });
    if (addonIds.length) params.set('addon_ids', addonIds.join(','));
    const data = await apiRequest(`/admin/price-simulator/quote?${params}`);
    return data?.data ?? data;
}
