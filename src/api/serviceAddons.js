import { apiRequest } from './client.js';

function toList(data) {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.data) return [data.data];
  return data ?? [];
}

export async function getServiceAddons(serviceId, admin = true) {
  const path = admin ? '/admin/service-addons/service' : '/service-addons/service';
  const data = await apiRequest(`${path}/${serviceId}`);
  return toList(data);
}

export async function createServiceAddon(payload) {
  const data = await apiRequest('/admin/service-addons', {
    method: 'POST',
    body: JSON.stringify({
      service_id: payload.serviceId,
      name_en: payload.name,
      name_ar: payload.nameAr || payload.name,
      price: String(payload.price ?? 0),
      additional_duration: Number(payload.duration ?? 0),
      is_active: payload.isActive !== false,
    }),
  });
  return data?.data ?? data;
}

export async function updateServiceAddon(id, payload) {
  const body = {};
  if (payload.name !== undefined) body.name_en = payload.name;
  if (payload.nameAr !== undefined) body.name_ar = payload.nameAr;
  if (payload.price !== undefined) body.price = String(payload.price);
  if (payload.duration !== undefined) body.additional_duration = Number(payload.duration);
  if (payload.isActive !== undefined) body.is_active = payload.isActive;
  const data = await apiRequest(`/admin/service-addons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return data?.data ?? data;
}

export async function deleteServiceAddon(id) {
  await apiRequest(`/admin/service-addons/${id}`, { method: 'DELETE' });
}
