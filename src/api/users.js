import { apiRequest } from './client.js';

/**
 * List users (admin) – filter by role e.g. role=provider for service providers
 * Query: role, page, limit, search, status, zone, availability
 */
export async function getUsers(params = {}) {
  const query = new URLSearchParams();
  if (params.role) query.append('role', params.role);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.status && params.status !== 'All') query.append('status', params.status);
  if (params.zone && params.zone !== 'All Zones') query.append('zone', params.zone);
  if (params.availability && params.availability !== 'All') query.append('availability', params.availability);

  const queryString = query.toString();
  const url = `/users${queryString ? `?${queryString}` : ''}`;
  return apiRequest(url);
}

/**
 * Register a new customer via POST /api/v1/auth/signup
 */
export async function signupCustomer(payload) {
  const form = new FormData();
  form.append('role', 'customer');
  form.append('full_name', (payload.fullName || payload.name || '').trim());
  form.append('email', (payload.email || '').trim());
  form.append('password', payload.password);
  form.append('customer_type', payload.customerType || payload.accountType || 'normal');

  if (payload.phone?.trim()) form.append('phone', payload.phone.trim());
  if (payload.countryCode?.trim()) form.append('country_code', payload.countryCode.trim());
  if (payload.gender) form.append('gender', payload.gender);

  return apiRequest('/auth/signup', {
    method: 'POST',
    body: form,
  });
}

/**
 * Register a new service provider via POST /api/v1/auth/signup (multipart/form-data)
 */
export async function signupProvider(payload) {
  const form = new FormData();
  form.append('role', 'provider');
  form.append('email', (payload.email || '').trim());
  form.append('password', payload.password);
  form.append('full_name', (payload.fullName || '').trim());
  if (payload.phone?.trim()) form.append('phone', payload.phone.trim());
  if (payload.countryCode?.trim()) form.append('country_code', payload.countryCode.trim());
  if (payload.gender) form.append('gender', payload.gender);

  if (payload.governmentId && payload.governmentId instanceof File) {
    form.append('government_id', payload.governmentId);
  }
  if (payload.certification && payload.certification instanceof File) {
    form.append('certification', payload.certification);
  }
  if (payload.insurance && payload.insurance instanceof File) {
    form.append('insurance', payload.insurance);
  }
  if (payload.businessLicense && payload.businessLicense instanceof File) {
    form.append('business_license', payload.businessLicense);
  }

  const serviceIds = Array.isArray(payload.serviceIds) ? payload.serviceIds : [];
  serviceIds.forEach((id) => {
    form.append('service_ids', String(id));
  });

  return apiRequest('/auth/signup', {
    method: 'POST',
    body: form,
  });
}
