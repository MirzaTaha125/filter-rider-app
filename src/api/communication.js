import { apiRequest } from './client.js';

/** GET /admin/communication/templates – List all templates */
export async function getCommunicationTemplates() {
  const data = await apiRequest('/admin/communication/templates');
  return Array.isArray(data) ? data : (data?.templates ?? data?.items ?? []);
}

/** GET /admin/communication/templates/{id} – Get single template */
export async function getCommunicationTemplate(id) {
  return apiRequest(`/admin/communication/templates/${id}`);
}

/** POST /admin/communication/templates – Create template */
export async function createCommunicationTemplate(payload) {
  return apiRequest('/admin/communication/templates', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      slug: payload.slug,
      channel: payload.channel,
      email_subject: payload.emailSubject || undefined,
      email_body: payload.emailBody || undefined,
      sms_body: payload.smsBody || undefined,
      is_active: payload.isActive ?? true,
    }),
  });
}

/** PATCH /admin/communication/templates/{id} – Update template */
export async function updateCommunicationTemplate(id, payload) {
  const body = {};
  if (payload.name != null)         body.name          = payload.name;
  if (payload.slug != null)         body.slug          = payload.slug;
  if (payload.channel != null)      body.channel       = payload.channel;
  if (payload.emailSubject != null) body.email_subject = payload.emailSubject;
  if (payload.emailBody != null)    body.email_body    = payload.emailBody;
  if (payload.smsBody != null)      body.sms_body      = payload.smsBody;
  if (payload.isActive != null)     body.is_active     = payload.isActive;
  return apiRequest(`/admin/communication/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** DELETE /admin/communication/templates/{id} – Delete template */
export async function deleteCommunicationTemplate(id) {
  return apiRequest(`/admin/communication/templates/${id}`, { method: 'DELETE' });
}

// ── Content Pages ──────────────────────────────────────────────────────────────

/** GET /admin/communication/content-pages – List all content pages */
export async function getContentPages() {
  const data = await apiRequest('/admin/communication/content-pages');
  return Array.isArray(data) ? data : (data?.pages ?? data?.items ?? []);
}

/** GET /admin/communication/content-pages/{id} – Get content page by id */
export async function getContentPage(id) {
  return apiRequest(`/admin/communication/content-pages/${id}`);
}

/** GET /admin/communication/content-pages/key/{key} – Get content page by key */
export async function getContentPageByKey(key) {
  return apiRequest(`/admin/communication/content-pages/key/${key}`);
}

/** POST /admin/communication/content-pages – Create content page */
export async function createContentPage(payload) {
  return apiRequest('/admin/communication/content-pages', {
    method: 'POST',
    body: JSON.stringify({
      key: payload.key,
      title: payload.title,
      content: payload.content || '',
      version_label: payload.versionLabel || undefined,
      status: payload.status || 'DRAFT',
      is_active: payload.isActive ?? true,
    }),
  });
}

/** PATCH /admin/communication/content-pages/{id} – Update content page */
export async function updateContentPage(id, payload) {
  const body = {};
  if (payload.title != null)        body.title         = payload.title;
  if (payload.content != null)      body.content       = payload.content;
  if (payload.versionLabel != null) body.version_label = payload.versionLabel;
  if (payload.status != null)       body.status        = payload.status;
  if (payload.isActive != null)     body.is_active     = payload.isActive;
  return apiRequest(`/admin/communication/content-pages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** DELETE /admin/communication/content-pages/{id} – Delete content page */
export async function deleteContentPage(id) {
  return apiRequest(`/admin/communication/content-pages/${id}`, { method: 'DELETE' });
}
