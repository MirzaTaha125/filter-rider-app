import { apiRequest } from './client.js';

/** GET /admin/rewards – List all reward rules */
export async function getRewardRules() {
  const data = await apiRequest('/admin/rewards');
  return Array.isArray(data) ? data : (data?.rules ?? data?.items ?? []);
}

/** GET /admin/rewards/{id} – Get a reward rule */
export async function getRewardRule(id) {
  return apiRequest(`/admin/rewards/${id}`);
}

function toBody(payload) {
  const kind = payload.rewardKind || 'WALLET';
  const body = {
    name: payload.name,
    audience: payload.audience,
    trigger: payload.trigger,
    reward_kind: kind,
    is_active: payload.isActive ?? true,
  };
  if (kind === 'WALLET') {
    body.reward_amount = Number(payload.rewardAmount);
  } else {
    body.discount_type = payload.discountType;
    body.discount_value = Number(payload.discountValue);
    body.service_ids = payload.serviceIds || [];
  }
  if (payload.description != null) body.description = payload.description || null;
  if (payload.nameAr != null) body.name_ar = payload.nameAr || null;
  if (payload.descriptionAr != null) body.description_ar = payload.descriptionAr || null;
  if (payload.trigger === 'ORDERS_COMPLETED' && payload.threshold) {
    body.threshold = Number(payload.threshold);
  }
  if (payload.repeatMode) body.repeat_mode = payload.repeatMode;
  if (payload.maxGrants) body.max_grants = Number(payload.maxGrants);
  if (payload.validFrom) {
    body.valid_from = new Date(`${payload.validFrom}T00:00:00`).toISOString();
  }
  if (payload.validTo) {
    body.valid_to = new Date(`${payload.validTo}T23:59:59`).toISOString();
  }
  if (payload.cardColor !== undefined) body.card_color = payload.cardColor || null;
  if (payload.iconUrl !== undefined) body.icon_url = payload.iconUrl || null;
  return body;
}

/** POST /admin/rewards – Create a reward rule */
export async function createRewardRule(payload) {
  return apiRequest('/admin/rewards', {
    method: 'POST',
    body: JSON.stringify(toBody(payload)),
  });
}

/** PATCH /admin/rewards/{id} – Update a reward rule */
export async function updateRewardRule(id, payload) {
  const body = {};
  if (payload.name != null) body.name = payload.name;
  if (payload.description !== undefined) body.description = payload.description || null;
  if (payload.nameAr !== undefined) body.name_ar = payload.nameAr || null;
  if (payload.descriptionAr !== undefined) body.description_ar = payload.descriptionAr || null;
  if (payload.audience != null) body.audience = payload.audience;
  if (payload.trigger != null) body.trigger = payload.trigger;
  if (payload.rewardKind != null) body.reward_kind = payload.rewardKind;
  if (payload.rewardAmount != null && payload.rewardAmount !== '') {
    body.reward_amount = Number(payload.rewardAmount);
  }
  if (payload.discountType != null) body.discount_type = payload.discountType;
  if (payload.discountValue != null && payload.discountValue !== '') {
    body.discount_value = Number(payload.discountValue);
  }
  if (payload.serviceIds != null) body.service_ids = payload.serviceIds;
  if (payload.threshold != null && payload.threshold !== '') {
    body.threshold = Number(payload.threshold);
  }
  if (payload.repeatMode != null) body.repeat_mode = payload.repeatMode;
  if (payload.maxGrants !== undefined && payload.maxGrants !== '' && payload.maxGrants != null) {
    body.max_grants = Number(payload.maxGrants);
  }
  if (payload.validFrom !== undefined) {
    body.valid_from = payload.validFrom
      ? new Date(`${payload.validFrom}T00:00:00`).toISOString()
      : null;
  }
  if (payload.validTo !== undefined) {
    body.valid_to = payload.validTo
      ? new Date(`${payload.validTo}T23:59:59`).toISOString()
      : null;
  }
  if (payload.isActive != null) body.is_active = payload.isActive;
  if (payload.cardColor !== undefined) body.card_color = payload.cardColor || null;
  if (payload.iconUrl !== undefined) body.icon_url = payload.iconUrl || null;
  return apiRequest(`/admin/rewards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** PATCH /admin/rewards/{id}/status – Toggle a reward rule */
export async function updateRewardRuleStatus(id, isActive) {
  return apiRequest(`/admin/rewards/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });
}

/** DELETE /admin/rewards/{id} */
export async function deleteRewardRule(id) {
  return apiRequest(`/admin/rewards/${id}`, { method: 'DELETE' });
}
