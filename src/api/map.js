import { apiRequest } from './client.js';

/**
 * Map / locations API (admin) – for Dashboard real-time map
 * Returns service providers and orders with lat/lng for map pins.
 * Adjust path if Swagger uses e.g. /admin/map/overview or /admin/locations
 */

/**
 * GET – Map overview: active SPs and orders with coordinates.
 * Note: Backend currently returns 404 – endpoint not in Swagger. Dashboard uses default pins until this exists.
 * Response shape expected: { serviceProviders: [{ id, lat, lng, name, status, service }], orders: [{ id, lat, lng, customer, service }] }
 */
export async function getMapLocations(params = {}) {
  const query = new URLSearchParams();
  if (params.city) query.append('city', params.city);
  if (params.zoneId) query.append('zoneId', params.zoneId);
  const qs = query.toString();
  const url = `/admin/map/locations${qs ? `?${qs}` : ''}`;
  return apiRequest(url);
}
