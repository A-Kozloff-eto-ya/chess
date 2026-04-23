import type { ServerMessage, ClientMessage } from '~/types'

type MessageHandler = (msg: ServerMessage) => void

const dev = import.meta.dev

function getOrCreateSharedWs() {
  const ws = useState<WebSocket | null>('shared-ws', () => null)
  const isConnected = useState('shared-ws-connected', () => false)
  const reconnectAttempts = useState('shared-ws-reconnect', () => 0)
  const initialized = useState('shared-ws-init', () => false)
  const handlers: MessageHandler[] = []
  const messageQueue: ClientMessage[] = []
  const maxReconnectAttempts = 10

  let connectFn: (() => void) | null = null

  const connect = () => {
    if (!import.meta.client) return
    if (ws.value?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/_ws`
    if (dev) console.log('[WS] Connecting to', url)

    const socket = new WebSocket(url)

    socket.onopen = () => {
      if (dev) console.log('[WS] Connected')
      isConnected.value = true
      reconnectAttempts.value = 0
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift()!
        if (dev) console.log('[WS] Sending queued:', msg.type)
        socket.send(JSON.stringify(msg))
      }
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (dev) console.log('[WS] Received:', msg.type)
        for (const handler of handlers) {
          handler(msg)
        }
      } catch (e) {
        console.error('[WS] Failed to parse:', e)
      }
    }

    socket.onclose = () => {
      if (dev) console.log('[WS] Closed')
      isConnected.value = false
      if (reconnectAttempts.value < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value), 30000)
        reconnectAttempts.value++
        if (dev) console.log('[WS] Reconnecting in', delay, 'ms')
        setTimeout(() => connect(), delay)
      }
    }

    socket.onerror = () => {
      socket.close()
    }

    ws.value = socket
  }

  const send = (msg: ClientMessage) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(msg))
    } else {
      if (dev) console.log('[WS] Queuing:', msg.type)
      messageQueue.push(msg)
    }
  }

  const onMessage = (handler: MessageHandler) => {
    handlers.push(handler)
    return () => {
      const idx = handlers.indexOf(handler)
      if (idx > -1) handlers.splice(idx, 1)
    }
  }

  return { ws, isConnected, initialized, handlers, messageQueue, connect, send, onMessage }
}

let shared: ReturnType<typeof getOrCreateSharedWs> | null = null

function getSharedWs() {
  if (!shared) shared = getOrCreateSharedWs()
  return shared
}

export function useSharedWebSocket() {
  const { ws, isConnected, connect, send, onMessage } = getSharedWs()

  const initOnce = () => {
    connect()
  }

  return {
    ws,
    isConnected,
    connect,
    initOnce,
    send,
    onMessage,
  }
}
