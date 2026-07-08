import { apiRequest } from './client.js';

/**
 * Zones API (admin) – Swagger: GET/POST/PATCH/DELETE /admin/zones
 * Body: zone_name, city, center_lat, center_lng, polygon_json, is_active
 */

/** GET – List all zones */
export async function getZones(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.city) query.append('city', params.city);
  if (params.isActive != null) query.append('isActive', params.isActive);
  const qs = query.toString();
  const url = `/admin/zones${qs ? `?${qs}` : ''}`;
  return apiRequest(url);
}

/** GET – Get single zone by id */
export async function getZone(id) {
  return apiRequest(`/admin/zones/${id}`);
}

/** POST – Create zone. Swagger body: zone_name, city, center_lat, center_lng, polygon_json, is_active */
export async function createZone(payload) {
  const lat = payload.lat ?? payload.center_lat;
  const lng = payload.lng ?? payload.center_lng;
  const polygon = payload.polygon_json ?? (lat != null && lng != null ? [{ lat, lng }] : []);
  return apiRequest('/admin/zones', {
    method: 'POST',
    body: JSON.stringify({
      zone_name: payload.name ?? payload.zone_name,
      city: payload.city,
      center_lat: lat ?? 24.7136,
      center_lng: lng ?? 46.6753,
      polygon_json: polygon,
      is_active: payload.isActive !== false,
    }),
  });
}

/** PATCH – Update zone */
export async function updateZone(id, payload) {
  const body = {};
  if (payload.name != null) body.zone_name = payload.name;
  if (payload.zone_name != null) body.zone_name = payload.zone_name;
  if (payload.city != null) body.city = payload.city;
  if (payload.lat != null) body.center_lat = payload.lat;
  if (payload.lng != null) body.center_lng = payload.lng;
  if (payload.center_lat != null) body.center_lat = payload.center_lat;
  if (payload.center_lng != null) body.center_lng = payload.center_lng;
  if (payload.polygon_json != null) body.polygon_json = payload.polygon_json;
  if (payload.isActive != null) body.is_active = payload.isActive;
  return apiRequest(`/admin/zones/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** DELETE – Delete zone */
export async function deleteZone(id) {
  return apiRequest(`/admin/zones/${id}`, { method: 'DELETE' });
}

/** POST – Refresh service provider counts for all zones */
export async function refreshZoneProviderCounts() {
  return apiRequest('/admin/zones/refresh-provider-counts', { method: 'POST' });
}
