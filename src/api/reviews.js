import { apiRequest } from './client.js';

/** GET /admin/reviews — tab: services | customers | service_providers */
export async function getAdminReviews(params = {}) {
  const qs = new URLSearchParams();
  if (params.tab) qs.set('tab', params.tab);
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return apiRequest(`/admin/reviews${q ? `?${q}` : ''}`);
}
