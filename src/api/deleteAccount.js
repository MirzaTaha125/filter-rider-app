const BASE_URL = import.meta.env.VITE_API_URL || 'https://flterhomeapitemp.duckdns.org/api/v1';

/**
 * Self-serve account deletion via phone OTP (customer or provider).
 * Uses raw fetch so we never touch / collide with the admin session.
 */

function audienceBase(audience) {
  return audience === 'PROVIDER' ? '/provider/auth' : '/customer/auth';
}

async function publicRequest(endpoint, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = json;
    throw err;
  }

  return json.data !== undefined ? json.data : json;
}

/** POST /{customer|provider}/auth/otp/send */
export async function sendDeleteAccountOtp({
  audience,
  phone,
  countryCode = '+966',
}) {
  return publicRequest(`${audienceBase(audience)}/otp/send`, {
    method: 'POST',
    body: {
      destination: phone,
      country_code: countryCode,
      purpose: 'LOGIN',
    },
  });
}

/**
 * POST /{customer|provider}/auth/otp/verify
 * Returns access_token used only for the delete call.
 */
export async function verifyDeleteAccountOtp({
  audience,
  phone,
  otp,
  countryCode = '+966',
}) {
  const data = await publicRequest(`${audienceBase(audience)}/otp/verify`, {
    method: 'POST',
    body: {
      destination: phone,
      country_code: countryCode,
      otp,
      purpose: 'LOGIN',
      device_id: 'web-delete-account',
      device_type: 'WEB',
    },
  });

  const tokenData = data?.data ?? data;
  return {
    ...tokenData,
    access_token:
      tokenData.access_token ?? tokenData.token ?? tokenData.accessToken ?? null,
  };
}

/** DELETE /users/me — soft-delete; name becomes “Name (deleted)” */
export async function confirmDeleteAccount(accessToken) {
  if (!accessToken) {
    throw new Error('Missing session token');
  }
  return publicRequest('/users/me', {
    method: 'DELETE',
    token: accessToken,
  });
}
