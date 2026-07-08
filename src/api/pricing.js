import { apiRequest } from './client.js';

// ── Platform Fee ────────────────────────────────────────────────────────────────

/** GET /admin/pricing/platform-fee – Get current platform fee config */
export async function getPlatformFee() {
  return apiRequest('/admin/pricing/platform-fee');
}

/** POST /admin/pricing/platform-fee – Create platform fee config */
export async function createPlatformFee(payload) {
  return apiRequest('/admin/pricing/platform-fee', {
    method: 'POST',
    body: JSON.stringify({
      commission_type: payload.commissionType,
      commission_value: Number(payload.commissionValue),
      application_layer: payload.applicationLayer,
      is_active: payload.isActive ?? true,
    }),
  });
}

/** PATCH /admin/pricing/platform-fee – Update platform fee config */
export async function updatePlatformFee(payload) {
  const body = {};
  if (payload.commissionType != null)  body.commission_type  = payload.commissionType;
  if (payload.commissionValue != null) body.commission_value = Number(payload.commissionValue);
  if (payload.applicationLayer != null) body.application_layer = payload.applicationLayer;
  if (payload.isActive != null)        body.is_active        = payload.isActive;
  return apiRequest('/admin/pricing/platform-fee', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// ── Surge Rules ─────────────────────────────────────────────────────────────────

/** GET /admin/pricing/surge-rules – List surge rules */
export async function getSurgeRules() {
  const data = await apiRequest('/admin/pricing/surge-rules');
  return Array.isArray(data) ? data : (data?.rules ?? []);
}

/**
 * PUT /admin/pricing/surge-rules – Create or replace all surge rules
 * @param {Array<{demand_level, multiplier, min_availability, max_availability, is_active}>} rules
 */
export async function saveSurgeRules(rules) {
  const data = await apiRequest('/admin/pricing/surge-rules', {
    method: 'PUT',
    body: JSON.stringify({ rules }),
  });
  return Array.isArray(data) ? data : (data?.rules ?? []);
}

// ── Regional Pricing ────────────────────────────────────────────────────────────

/** GET /admin/pricing/regional – List regional pricing */
export async function getRegionalPricing() {
  const data = await apiRequest('/admin/pricing/regional');
  return Array.isArray(data) ? data : (data?.items ?? []);
}

/** POST /admin/pricing/regional – Create regional pricing for a zone */
export async function createRegionalPricing(payload) {
  return apiRequest('/admin/pricing/regional', {
    method: 'POST',
    body: JSON.stringify({
      zone_id: payload.zoneId,
      base_price: Number(payload.basePrice),
      commission_percent: Number(payload.commissionPercent),
      is_active: payload.isActive ?? true,
    }),
  });
}

/** GET /admin/pricing/regional/{id} – Get regional pricing details */
export async function getRegionalPricingById(id) {
  return apiRequest(`/admin/pricing/regional/${id}`);
}

/** PATCH /admin/pricing/regional/{id} – Update regional pricing */
export async function updateRegionalPricing(id, payload) {
  const body = {};
  if (payload.zoneId != null)           body.zone_id           = payload.zoneId;
  if (payload.basePrice != null)        body.base_price        = Number(payload.basePrice);
  if (payload.commissionPercent != null) body.commission_percent = Number(payload.commissionPercent);
  if (payload.isActive != null)         body.is_active         = payload.isActive;
  return apiRequest(`/admin/pricing/regional/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** DELETE /admin/pricing/regional/{id} – Delete regional pricing */
export async function deleteRegionalPricing(id) {
  return apiRequest(`/admin/pricing/regional/${id}`, { method: 'DELETE' });
}

// ── Public Setup ────────────────────────────────────────────────────────────────

/** GET /pricing/setup – Get active pricing setup (platform fee + surge + regional) */
export async function getPricingSetup() {
  return apiRequest('/pricing/setup');
}
