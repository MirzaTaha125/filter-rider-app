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
  const body = {
    name: payload.name,
    audience: payload.audience,
    trigger: payload.trigger,
    reward_amount: Number(payload.rewardAmount),
    is_active: payload.isActive ?? true,
  };
  if (payload.description != null) body.description = payload.description || null;
  if (payload.trigger === 'ORDERS_COMPLETED' && payload.threshold) {
    body.threshold = Number(payload.threshold);
  }
  if (payload.repeatMode) body.repeat_mode = payload.repeatMode;
  if (payload.maxGrants) body.max_grants = Number(payload.maxGrants);
  if (payload.validFrom) body.valid_from = new Date(payload.validFrom).toISOString();
  if (payload.validTo) body.valid_to = new Date(payload.validTo).toISOString();
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
  if (payload.audience != null) body.audience = payload.audience;
  if (payload.trigger != null) body.trigger = payload.trigger;
  if (payload.rewardAmount != null) body.reward_amount = Number(payload.rewardAmount);
  if (payload.threshold != null && payload.threshold !== '') {
    body.threshold = Number(payload.threshold);
  }
  if (payload.repeatMode != null) body.repeat_mode = payload.repeatMode;
  if (payload.maxGrants !== undefined && payload.maxGrants !== '' && payload.maxGrants != null) {
    body.max_grants = Number(payload.maxGrants);
  }
  if (payload.validFrom !== undefined) {
    body.valid_from = payload.validFrom ? new Date(payload.validFrom).toISOString() : null;
  }
  if (payload.validTo !== undefined) {
    body.valid_to = payload.validTo ? new Date(payload.validTo).toISOString() : null;
  }
  if (payload.isActive != null) body.is_active = payload.isActive;
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
