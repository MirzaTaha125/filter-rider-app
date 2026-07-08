import { apiRequest } from './client.js';

/**
 * Admin profile and account APIs.
 */

export async function getAdminProfile() {
  try {
    return await apiRequest('/users/me');
  } catch {
    return null;
  }
}

export async function updateAdminProfile(payload) {
  const body = {};
  if (payload.fullName != null) body.full_name = payload.fullName;
  if (payload.email != null) body.email = payload.email;
  if (payload.phone != null) body.phone = payload.phone;
  if (payload.countryCode != null) body.country_code = payload.countryCode;
  if (payload.address != null) body.address = payload.address;
  if (payload.city != null) body.city = payload.city;
  if (payload.state != null) body.state = payload.state;
  if (payload.zipCode != null) body.zip_code = payload.zipCode;
  if (payload.country != null) body.country = payload.country;
  if (payload.bio != null) body.bio = payload.bio;
  if (payload.department != null) body.department = payload.department;
  if (payload.role != null) body.role = payload.role;

  return apiRequest('/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * Update profile via PATCH /users/profile (Swagger: Users)
 * Use this if the backend expects profile updates on /users/profile.
 */
export async function updateUserProfile(payload) {
  const body = {};
  if (payload.fullName != null) body.full_name = payload.fullName;
  if (payload.email != null) body.email = payload.email;
  if (payload.phone != null) body.phone = payload.phone;
  if (payload.countryCode != null) body.country_code = payload.countryCode;
  if (payload.address != null) body.address = payload.address;
  if (payload.city != null) body.city = payload.city;
  if (payload.state != null) body.state = payload.state;
  if (payload.zipCode != null) body.zip_code = payload.zipCode;
  if (payload.country != null) body.country = payload.country;
  if (payload.bio != null) body.bio = payload.bio;
  return apiRequest('/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function changeAdminPassword(currentPassword, newPassword) {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}
