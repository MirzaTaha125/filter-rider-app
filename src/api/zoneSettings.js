import { apiRequest } from './client.js';

/** GET /admin/zone-settings – order search radius and provider travel settings */
export async function getZoneSettings() {
    return apiRequest('/admin/zone-settings');
}

/** PUT /admin/zone-settings – save them */
export async function saveZoneSettings(settings) {
    return apiRequest('/admin/zone-settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
}
