import { io } from 'socket.io-client'

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'https://filter-home-temp.duckdns.org'

// Namespace is part of the URL as per backend integration guide.
// Each namespace is a separate Socket.io endpoint on the same server.
const opts = (accessToken) => ({
  transports: ['polling', 'websocket'],
  auth: { token: `Bearer ${accessToken}` },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 3000,
  reconnectionDelayMax: 30000,
  timeout: 10000,
})

export const createPresenceSocket = (accessToken) =>
  io(`${BACKEND_URL}/api/v1/ws/presence`, opts(accessToken))

export const createOrdersSocket = (accessToken) =>
  io(`${BACKEND_URL}/api/v1/ws/orders`, opts(accessToken))

export const createCatalogSocket = (accessToken) =>
  io(`${BACKEND_URL}/api/v1/ws/catalog`, opts(accessToken))
