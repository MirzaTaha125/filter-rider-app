import { useEffect, useRef, useCallback } from 'react'

const INITIAL_RETRY_DELAY = 3000   // 3s
const MAX_RETRY_DELAY     = 60000  // 60s cap
const MAX_RETRIES         = 5      // give up after 5 attempts (endpoint may not exist)

/**
 * Generic reconnecting WebSocket hook.
 * Gracefully does nothing if the endpoint is unavailable (no console spam after max retries).
 */
export function useWebSocket(url, handlers = {}) {
  const wsRef         = useRef(null)
  const retryCount    = useRef(0)
  const retryTimer    = useRef(null)
  const handlersRef   = useRef(handlers)
  const activeRef     = useRef(false)   // true only between mount and unmount

  useEffect(() => { handlersRef.current = handlers })

  const connect = useCallback(() => {
    if (!url || !activeRef.current) return
    if (retryCount.current >= MAX_RETRIES) return  // endpoint probably doesn't exist — stop silently

    const token   = localStorage.getItem('adminToken')
    const fullUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url

    let ws
    try {
      ws = new WebSocket(fullUrl)
    } catch {
      return   // invalid URL — bail out
    }
    wsRef.current = ws

    const connectedAt = Date.now()

    ws.onopen = () => {
      if (!activeRef.current) { ws.close(); return }
      retryCount.current = 0
      handlersRef.current.onOpen?.()
    }

    ws.onmessage = (event) => {
      if (!activeRef.current) return
      try {
        const msg = JSON.parse(event.data)
        handlersRef.current.onMessage?.(msg)
      } catch {
        handlersRef.current.onMessage?.(event.data)
      }
    }

    ws.onclose = () => {
      handlersRef.current.onClose?.()
      if (!activeRef.current) return

      // If it failed almost instantly (< 500ms), the endpoint likely doesn't exist
      const elapsed = Date.now() - connectedAt
      if (elapsed < 500) {
        retryCount.current++   // count fast-fails faster toward the give-up limit
      }

      if (retryCount.current >= MAX_RETRIES) return   // give up silently

      const delay = Math.min(INITIAL_RETRY_DELAY * 2 ** retryCount.current, MAX_RETRY_DELAY)
      retryCount.current++
      retryTimer.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      // suppress — onclose will handle retry
      ws.close()
    }
  }, [url])

  useEffect(() => {
    activeRef.current = true
    connect()
    return () => {
      activeRef.current = false
      clearTimeout(retryTimer.current)
      wsRef.current?.close()
    }
  }, [connect])
}
