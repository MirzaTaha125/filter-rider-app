import { apiRequest } from './client.js';

function toList(data) {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.data) return [data.data];
  return data ?? [];
}


export async function getPricingMatrix(serviceId) {
  const data = await apiRequest(`/admin/pricing-matrix/${serviceId}`);
  return toList(data);
}

export async function getAllPricingMatrix(services) {
  const list = services || [];
  const results = await Promise.all(
    list.map(async (svc) => {
      try {
        const rows = await getPricingMatrix(svc.id);
        return (rows || []).map((r) => ({ ...r, _serviceName: svc.name_en || svc.name }));
      } catch {
        return [];
      }
    })
  );
  return results.flat();
}

export async function createPricingMatrix(payload) {
  const data = await apiRequest('/admin/pricing-matrix', {
    method: 'POST',
    body: JSON.stringify({
      service_id: payload.serviceId,
      size_category_id: payload.sizeCategoryId,
      base_price: String(payload.basePrice ?? 0),
      duration_min: Number(payload.duration ?? 60),
      status: payload.status !== false && payload.status !== 'INACTIVE',
    }),
  });
  return data?.data ?? data;
}

export async function updatePricingMatrix(serviceId, sizeCategoryId, payload) {
  const body = {};
  if (payload.basePrice !== undefined) body.base_price = String(payload.basePrice);
  if (payload.duration !== undefined) body.duration_min = Number(payload.duration);
  if (payload.status !== undefined) body.status = payload.status;
  const data = await apiRequest(`/admin/pricing-matrix/${serviceId}/${sizeCategoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return data?.data ?? data;
}

export async function deletePricingMatrix(serviceId, sizeCategoryId) {
  await apiRequest(`/admin/pricing-matrix/${serviceId}/${sizeCategoryId}`, {
    method: 'DELETE',
  });
}
