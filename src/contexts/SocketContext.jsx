import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { createPresenceSocket, createOrdersSocket, createCatalogSocket } from '../socket/socketFactory'

const SocketContext = createContext({
  presenceSocket: null,
  ordersSocket: null,
  catalogSocket: null,
  connected: { presence: false, orders: false, catalog: false },
  reconnectAll: () => {},
})

export function SocketProvider({ children }) {
  const presenceRef = useRef(null)
  const ordersRef   = useRef(null)
  const catalogRef  = useRef(null)
  const heartbeatRef = useRef(null)
  const [connected, setConnected] = useState({ presence: false, orders: false, catalog: false })

  const setConn = (ns, val) => setConnected((prev) => ({ ...prev, [ns]: val }))

  const disconnectAll = useCallback(() => {
    clearInterval(heartbeatRef.current)
    presenceRef.current?.disconnect()
    ordersRef.current?.disconnect()
    catalogRef.current?.disconnect()
    presenceRef.current = null
    ordersRef.current   = null
    catalogRef.current  = null
    setConnected({ presence: false, orders: false, catalog: false })
  }, [])

  const connectAll = useCallback((token) => {
    if (!token) return
    disconnectAll()

    // ── Presence ──────────────────────────────────────────────────────────────
    const presence = createPresenceSocket(token)
    presenceRef.current = presence

    presence.on('connect', () => {
      setConn('presence', true)
      heartbeatRef.current = setInterval(() => {
        presence.emit('presence.heartbeat')
      }, 30000)
    })

    presence.on('disconnect', () => {
      setConn('presence', false)
      clearInterval(heartbeatRef.current)
    })

    // ── Orders ────────────────────────────────────────────────────────────────
    const orders = createOrdersSocket(token)
    ordersRef.current = orders
    orders.on('connect',    () => setConn('orders', true))
    orders.on('disconnect', () => setConn('orders', false))

    // ── Catalog (connect lazily on demand) ────────────────────────────────────
    const catalog = createCatalogSocket(token)
    catalogRef.current = catalog
    catalog.on('connect',    () => setConn('catalog', true))
    catalog.on('disconnect', () => setConn('catalog', false))
  }, [disconnectAll])

  // Connect on mount using stored token.
  // setTimeout(0) defers past React Strict Mode's mount→cleanup→mount double-invoke,
  // so the first (discarded) mount never actually opens a socket.
  useEffect(() => {
    let timer = setTimeout(() => {
      const token = localStorage.getItem('adminToken')
      connectAll(token)
    }, 0)

    const onTokenRefreshed = (e) => connectAll(e.detail?.token)
    window.addEventListener('admin:token-refreshed', onTokenRefreshed)

    return () => {
      clearTimeout(timer)
      disconnectAll()
      window.removeEventListener('admin:token-refreshed', onTokenRefreshed)
    }
  }, [connectAll, disconnectAll])

  return (
    <SocketContext.Provider value={{
      presenceSocket: presenceRef.current,
      ordersSocket:   ordersRef.current,
      catalogSocket:  catalogRef.current,
      connected,
      reconnectAll: () => connectAll(localStorage.getItem('adminToken')),
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
