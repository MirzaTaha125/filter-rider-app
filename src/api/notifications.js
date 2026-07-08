import { apiRequest } from './client.js';

/**
 * Notifications API – Swagger: /api/v1/notifications
 */

/** POST /api/v1/notifications/fcm-token – Save FCM device token for push notifications */
export async function saveFcmToken(token) {
  return apiRequest('/notifications/fcm-token', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}
