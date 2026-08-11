import { apiRequest } from './client.js';

/** GET /admin/promotions – List all promotions */
export async function getPromotions() {
  const data = await apiRequest('/admin/promotions');
  return Array.isArray(data) ? data : (data?.promotions ?? data?.items ?? []);
}

/** GET /admin/promotions/{id} – Get promotion details */
export async function getPromotion(id) {
  return apiRequest(`/admin/promotions/${id}`);
}

/** POST /admin/promotions – Create promotion */
export async function createPromotion(payload) {
  const body = {
    code: payload.code,
    title: payload.title,
    discount_type: payload.discountType,
    discount_value: Number(payload.discountValue),
    status: payload.status ?? 'DRAFT',
    is_active: payload.isActive ?? false,
  };
  if (payload.maxDiscount)       body.max_discount       = Number(payload.maxDiscount);
  if (payload.totalUsageLimit)   body.total_usage_limit  = Number(payload.totalUsageLimit);
  if (payload.limitPerUser)      body.limit_per_user     = Number(payload.limitPerUser);
  if (payload.minOrderValue)     body.min_order_value    = Number(payload.minOrderValue);
  if (payload.validFrom)         body.valid_from         = new Date(payload.validFrom).toISOString();
  if (payload.validTo)           body.valid_to           = new Date(payload.validTo).toISOString();
  if (payload.zoneIds?.length)   body.zone_ids           = payload.zoneIds;
  if (payload.serviceIds?.length) body.service_ids       = payload.serviceIds;
  if (payload.bannerBadge != null)      body.banner_badge      = payload.bannerBadge || null;
  if (payload.bannerTitle != null)      body.banner_title      = payload.bannerTitle || null;
  if (payload.bannerSubtitle != null)   body.banner_subtitle   = payload.bannerSubtitle || null;
  if (payload.bannerImageUrl != null)   body.banner_image_url  = payload.bannerImageUrl || null;
  if (payload.showOnHome != null)       body.show_on_home      = Boolean(payload.showOnHome);
  if (payload.bannerSortOrder != null && payload.bannerSortOrder !== '') {
    body.banner_sort_order = Number(payload.bannerSortOrder);
  }

  return apiRequest('/admin/promotions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** PATCH /admin/promotions/{id} – Update promotion fields */
export async function updatePromotion(id, payload) {
  const body = {};
  if (payload.code != null)             body.code              = payload.code;
  if (payload.title != null)            body.title             = payload.title;
  if (payload.discountType != null)     body.discount_type     = payload.discountType;
  if (payload.discountValue != null)    body.discount_value    = Number(payload.discountValue);
  if (payload.maxDiscount != null)      body.max_discount      = Number(payload.maxDiscount);
  if (payload.totalUsageLimit != null)  body.total_usage_limit = Number(payload.totalUsageLimit);
  if (payload.limitPerUser != null)     body.limit_per_user    = Number(payload.limitPerUser);
  if (payload.minOrderValue != null)    body.min_order_value   = Number(payload.minOrderValue);
  if (payload.validFrom != null)        body.valid_from        = new Date(payload.validFrom).toISOString();
  if (payload.validTo != null)          body.valid_to          = new Date(payload.validTo).toISOString();
  if (payload.zoneIds != null)          body.zone_ids          = payload.zoneIds;
  if (payload.serviceIds != null)       body.service_ids       = payload.serviceIds;
  if (payload.status != null)           body.status            = payload.status;
  if (payload.isActive != null)         body.is_active         = payload.isActive;
  if (payload.bannerBadge != null)      body.banner_badge      = payload.bannerBadge || null;
  if (payload.bannerTitle != null)      body.banner_title      = payload.bannerTitle || null;
  if (payload.bannerSubtitle != null)   body.banner_subtitle   = payload.bannerSubtitle || null;
  if (payload.bannerImageUrl != null)   body.banner_image_url  = payload.bannerImageUrl || null;
  if (payload.showOnHome != null)       body.show_on_home      = Boolean(payload.showOnHome);
  if (payload.bannerSortOrder != null && payload.bannerSortOrder !== '') {
    body.banner_sort_order = Number(payload.bannerSortOrder);
  }

  return apiRequest(`/admin/promotions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** PATCH /admin/promotions/{id}/status – Update promotion status */
export async function updatePromotionStatus(id, status, isActive) {
  return apiRequest(`/admin/promotions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, is_active: isActive }),
  });
}

/** DELETE /admin/promotions/{id} – Delete promotion */
export async function deletePromotion(id) {
  return apiRequest(`/admin/promotions/${id}`, { method: 'DELETE' });
}
