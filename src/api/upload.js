import { API_BASE_URL, getAuthToken } from './client.js';

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

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * Upload an image to POST /storage/upload into `folder` (e.g. "services").
 * Returns the stored file URL. Only JPG / PNG / WEBP up to 5 MB.
 */
export async function uploadImage(file, folder) {
  if (!IMAGE_TYPES.includes(file?.type)) {
    throw new Error('Choose a JPG, PNG or WEBP image.')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('The image must be 5 MB or smaller.')
  }

  const form = new FormData()
  form.append('folder', folder)
  form.append('file', file)
  const token = getAuthToken()
  const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/storage/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || (res.status === 401 ? 'Your session has expired. Sign in again.' : 'Image upload failed'))
  }
  const url = json.data?.url ?? json.url
  if (!url) throw new Error('Upload did not return a URL')
  return url
}

