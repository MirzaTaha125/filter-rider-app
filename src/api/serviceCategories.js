import { apiRequest } from './client.js';

function toList(data) {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.data) return [data.data];
  if (data && typeof data === 'object') return [data];
  return [];
}

/**
 * Image, display order and price range. With priceSource AUTO the API works
 * the range out from the category's services, so no prices are sent.
 */
function priceAndOrder(payload) {
  const body = {};
  if (payload.imageUrl !== undefined) body.image_url = payload.imageUrl || null;
  if (payload.displayOrder !== undefined) body.display_order = payload.displayOrder;
  if (payload.priceSource !== undefined) {
    body.price_source = payload.priceSource;
    if (payload.priceSource === 'MANUAL') {
      body.price_from = payload.priceFrom;
      body.price_to = payload.priceTo;
    }
  }
  return body;
}

export async function getServiceCategories(admin = false) {
  const path = admin ? '/admin/service-categories' : '/service-categories';
  const data = await apiRequest(path);
  return toList(data);
}

/**
 * Single category for the edit form. The admin API exposes no GET /:id, so the
 * list is filtered instead — it is small and already the page's source of truth.
 */
export async function getServiceCategory(id) {
  const list = await getServiceCategories(true);
  return list.find((item) => String(item.id) === String(id)) ?? null;
}

export async function createServiceCategory(payload) {
  const data = await apiRequest('/admin/service-categories', {
    method: 'POST',
    body: JSON.stringify({
      title_en: payload.name,
      title_ar: payload.nameAr || payload.name,
      description_en: payload.descriptionEn || null,
      description_ar: payload.descriptionAr || null,
      icon: payload.icon,
      icon_color: payload.color || '#3b82f6',
      is_active: payload.isActive !== false,
      ...priceAndOrder(payload),
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
      description_en: payload.descriptionEn ?? null,
      description_ar: payload.descriptionAr ?? null,
      icon: payload.icon,
      icon_color: payload.color,
      is_active: payload.isActive,
      ...priceAndOrder(payload),
    }),
  });
  return data?.data ?? data;
}
