const BASE_URL = import.meta.env.VITE_API_URL || 'http://16.24.66.213/api/v1';
const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || `${BASE_URL.replace(/\/$/, '')}/admin/upload`;

function getToken() {
  return localStorage.getItem('adminToken');
}

/**
 * Upload a single file to POST /admin/upload (multipart).
 * Returns the file URL from response.
 * Requires backend endpoint: POST /admin/upload (accepts 'file', returns { url }).
 */
export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const token = getToken();
  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        'Upload endpoint not found (404). Add POST /admin/upload to your backend. It should accept multipart "file" and return { url: "..." }.'
      );
    }
    throw new Error(json.message || 'Upload failed');
  }
  const url = json.url ?? json.data?.url ?? json.data?.file?.url ?? (typeof json.data === 'string' ? json.data : null);
  if (!url) throw new Error('Upload did not return a URL');
  return url;
}
