import { apiRequest } from './client.js';

/**
 * Maps API – ETA, geocode, reverse-geocode, autocomplete
 * Backend uses google_maps_server_key from admin settings.
 * POST /api/v1/maps/eta, /geocode, /reverse-geocode, /provider-to-customer-eta, /customer-to-provider-eta
 * GET /api/v1/maps/autocomplete
 */

/** POST – ETA between two coordinates */
export async function getEta(originLat, originLng, destinationLat, destinationLng) {
  return apiRequest('/maps/eta', {
    method: 'POST',
    body: JSON.stringify({
      origin_lat: originLat,
      origin_lng: originLng,
      destination_lat: destinationLat,
      destination_lng: destinationLng,
    }),
  });
}

/** POST – Geocode: address text → coordinates */
export async function geocode(address) {
  return apiRequest('/maps/geocode', {
    method: 'POST',
    body: JSON.stringify({ address }),
  });
}

/** POST – Reverse geocode: coordinates → address text */
export async function reverseGeocode(latitude, longitude) {
  return apiRequest('/maps/reverse-geocode', {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude }),
  });
}

/** GET – Autocomplete address/place search */
export async function autocomplete(input) {
  const qs = new URLSearchParams({ input: String(input).trim() }).toString();
  return apiRequest(`/maps/autocomplete?${qs}`);
}

/** POST – ETA from logged-in provider live location to customer coordinates */
export async function getProviderToCustomerEta(customerLat, customerLng) {
  return apiRequest('/maps/provider-to-customer-eta', {
    method: 'POST',
    body: JSON.stringify({
      customer_lat: customerLat,
      customer_lng: customerLng,
    }),
  });
}

/** POST – ETA from provider live location to logged-in customer default address */
export async function getCustomerToProviderEta(providerId) {
  return apiRequest('/maps/customer-to-provider-eta', {
    method: 'POST',
    body: JSON.stringify({ provider_id: providerId }),
  });
}
