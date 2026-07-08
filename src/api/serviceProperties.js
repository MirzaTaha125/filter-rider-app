import { apiRequest } from './client.js';

function toList(data) {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.data) return [data.data];
  return data ?? [];
}

export async function getServiceProperties(serviceId) {
  const data = await apiRequest(`/admin/service-properties/service/${serviceId}`);
  return toList(data);
}

export async function createServiceProperty(payload) {
  const data = await apiRequest('/admin/service-properties', {
    method: 'POST',
    body: JSON.stringify({
      service_id: payload.serviceId,
      name: payload.name,
      type: (payload.type || 'STRING').toUpperCase(),
    }),
  });
  return data?.data ?? data;
}

export async function updateServiceProperty(id, payload) {
  const body = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.type !== undefined) body.type = payload.type.toUpperCase();
  const data = await apiRequest(`/admin/service-properties/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return data?.data ?? data;
}

export async function deleteServiceProperty(id) {
  await apiRequest(`/admin/service-properties/${id}`, { method: 'DELETE' });
}
