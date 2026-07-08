import { apiRequest } from './client.js';

/** GET /service-providers – List active/suspended providers (not pending requests) */
export async function getProviders(params = {}) {
  const query = new URLSearchParams();
  if (params.page)         query.append('page', params.page);
  if (params.limit)        query.append('limit', params.limit);
  if (params.search)       query.append('search', params.search);
  if (params.status && params.status !== 'All')               query.append('status', params.status);
  if (params.zoneId && params.zoneId !== 'All')              query.append('zoneId', params.zoneId);
  if (params.liveStatus && params.liveStatus !== 'All')       query.append('liveStatus', params.liveStatus);

  const queryString = query.toString();
  return apiRequest(`/service-providers${queryString ? `?${queryString}` : ''}`);
}

/** GET /service-providers/summary/cards – Summary stats cards */
export async function getProviderSummary() {
  return apiRequest('/service-providers/summary/cards');
}

/** GET /service-providers/requests – List provider registration requests */
export async function getProviderRequests(params = {}) {
  const query = new URLSearchParams();
  if (params.search)  query.append('search', params.search);
  if (params.status)  query.append('status', params.status);
  if (params.page)    query.append('page', params.page);
  if (params.limit)   query.append('limit', params.limit);

  const queryString = query.toString();
  return apiRequest(`/service-providers/requests${queryString ? `?${queryString}` : ''}`);
}

/** GET /service-providers/requests/{id} – Get request details for review */
export async function getProviderRequestDetails(id) {
  return apiRequest(`/service-providers/requests/${id}`);
}

/** POST /service-providers/requests/{id}/accept – Accept registration request */
export async function acceptProviderRequest(id) {
  return apiRequest(`/service-providers/requests/${id}/accept`, {
    method: 'POST',
  });
}

/** POST /service-providers/requests/{id}/reject – Reject registration request */
export async function rejectProviderRequest(id, reason, reasonCodeId, internalNotes) {
  return apiRequest(`/service-providers/requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason, reasonCodeId, internalNotes }),
  });
}

/** GET /service-providers/{id} – Get provider full details */
export async function getProviderDetails(id) {
  return apiRequest(`/service-providers/${id}`);
}

/** PATCH /service-providers/{id}/status – Update provider account status */
export async function updateProviderStatus(id, status, reason, reasonCodeId) {
  return apiRequest(`/service-providers/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(reason && { reason }), ...(reasonCodeId && { reasonCodeId }) }),
  });
}

/** POST /service-providers/{id}/services – Assign services to provider */
export async function assignProviderServices(id, serviceIds) {
  return apiRequest(`/service-providers/${id}/services`, {
    method: 'POST',
    body: JSON.stringify({ serviceIds }),
  });
}

/** DELETE /service-providers/{id}/services/{serviceId} – Remove service from provider */
export async function removeProviderService(id, serviceId) {
  return apiRequest(`/service-providers/${id}/services/${serviceId}`, {
    method: 'DELETE',
  });
}
