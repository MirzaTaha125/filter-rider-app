import { apiRequest } from './client.js';

function toList(data) {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.data) return [data.data];
  if (data && typeof data === 'object') return [data];
  return [];
}

export async function getServiceCategories(admin = false) {
  const path = admin ? '/admin/service-categories' : '/service-categories';
  const data = await apiRequest(path);
  return toList(data);
}

export async function createServiceCategory(payload) {
  const data = await apiRequest('/admin/service-categories', {
    method: 'POST',
    body: JSON.stringify({
      title_en: payload.name,
      title_ar: payload.nameAr || payload.name,
      icon_color: payload.color || '#3b82f6',
      is_active: payload.isActive !== false,
    }),
  });
  return data?.data ?? data;
}

export async function updateServiceCategory(id, payload) {
  const data = await apiRequest(`/admin/service-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title_en: payload.name,
      title_ar: payload.nameAr,
      icon_color: payload.color,
      is_active: payload.isActive,
    }),
  });
  return data?.data ?? data;
}

export async function deleteServiceCategory(id) {
  await apiRequest(`/admin/service-categories/${id}`, { method: 'DELETE' });
}
