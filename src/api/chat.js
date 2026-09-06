import { apiRequest } from './client.js';

/**
 * Admin chat API — read-only views over the customer ↔ provider conversations
 * that the mobile apps create per order.
 */

/** GET /admin/chat/rooms – conversation list, newest room first */
export async function getChatRooms(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.status && params.status !== 'All') query.append('status', params.status);

  const queryString = query.toString();
  return apiRequest(`/admin/chat/rooms${queryString ? `?${queryString}` : ''}`);
}

/** GET /admin/chat/rooms/{orderId}/messages – full thread, oldest first */
export async function getChatThread(orderId) {
  return apiRequest(`/admin/chat/rooms/${orderId}/messages`);
}

/** POST /admin/chat/rooms/{orderId}/messages – reply as support */
export async function sendChatMessage(orderId, content) {
  return apiRequest(`/admin/chat/rooms/${orderId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, type: 'TEXT' }),
  });
}

/** POST /admin/chat/rooms/{orderId}/read – clear this thread's unread count */
export async function markChatThreadRead(orderId) {
  return apiRequest(`/admin/chat/rooms/${orderId}/read`, { method: 'POST' });
}

/** GET /admin/chat/unread – total unread, for the sidebar badge */
export async function getChatUnreadCount() {
  return apiRequest('/admin/chat/unread');
}
