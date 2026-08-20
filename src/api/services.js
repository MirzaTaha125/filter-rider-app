import { apiRequest } from './client.js';

function toList(data) {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.data) return [data.data];
  return data ?? [];
}

export async function getServices(categoryId = null, admin = true) {
  const path = admin ? '/admin/services' : '/services';
  const url = categoryId ? `${path}?categoryId=${categoryId}` : path;
  const data = await apiRequest(url);
  return toList(data);
}

export async function getServicesByCategory(categoryId) {
  const data = await apiRequest(`/services/categories/${categoryId}`);
  return toList(data);
}

export async function getService(serviceId) {
  const data = await apiRequest(`/services/${serviceId}`);
  return data?.data ?? data;
}

export async function createService(payload) {
  const data = await apiRequest('/admin/services', {
    method: 'POST',
    body: JSON.stringify({
      category_id: payload.categoryId,
      name_en: payload.name,
      name_ar: payload.nameAr || payload.name,
      icon: payload.icon || null,
      icon_color: payload.color || '#3b82f6',
      base_price: String(payload.basePrice ?? 0),
      duration_min: Number(payload.duration ?? 60),
      is_active: payload.isActive !== false,
    }),
  });
  return data?.data ?? data;
}

export async function updateService(id, payload) {
  const body = {};
  if (payload.name !== undefined) body.name_en = payload.name;
  if (payload.nameAr !== undefined) body.name_ar = payload.nameAr;
  if (payload.categoryId !== undefined) body.category_id = payload.categoryId;
  if (payload.icon !== undefined) body.icon = payload.icon;
  if (payload.color !== undefined) body.icon_color = payload.color;
  if (payload.basePrice !== undefined) body.base_price = String(payload.basePrice);
  if (payload.duration !== undefined) body.duration_min = Number(payload.duration);
  if (payload.isActive !== undefined) body.is_active = payload.isActive;
  const data = await apiRequest(`/admin/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return data?.data ?? data;
}

export async function deleteService(id) {
  await apiRequest(`/admin/services/${id}`, { method: 'DELETE' });
}
