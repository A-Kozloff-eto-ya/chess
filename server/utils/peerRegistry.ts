import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

interface WsPeer {
  send: (data: string) => void
}

const connectedPeers = new Map<number, Set<WsPeer>>()

export function addPeer(userId: number, peer: WsPeer) {
  const wasOffline = !connectedPeers.has(userId)
  if (!connectedPeers.has(userId)) {
    connectedPeers.set(userId, new Set())
  }
  connectedPeers.get(userId)!.add(peer)
  if (wasOffline) {
    db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, userId))
      .catch((e: any) => console.error('[PeerRegistry] Failed to update lastSeenAt:', e.message))
  }
  return wasOffline
}

export function removePeer(userId: number, peer: WsPeer) {
  const peers = connectedPeers.get(userId)
  if (peers) {
    peers.delete(peer)
    if (peers.size === 0) {
      connectedPeers.delete(userId)
      db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, userId))
        .catch((e: any) => console.error('[PeerRegistry] Failed to update lastSeenAt:', e.message))
      return true
    }
  }
  return false
}

export function isUserOnline(userId: number) {
  return connectedPeers.has(userId)
}

export function getOnlineUserIds() {
  return new Set(connectedPeers.keys())
}

export function broadcastToAll(message: object) {
  const data = JSON.stringify(message)
  for (const peers of connectedPeers.values()) {
    for (const peer of peers) {
      try { peer.send(data) } catch { /* peer already closed */ }
    }
  }
}

export function sendToUser(userId: number, message: object) {
  const peers = connectedPeers.get(userId)
  if (!peers) return false
  const data = JSON.stringify(message)
  for (const peer of peers) {
    try { peer.send(data) } catch { /* peer already closed */ }
  }
  return true
}

export function broadcastToUsers(userIds: number[], message: object) {
  const data = JSON.stringify(message)
  for (const uid of userIds) {
    const peers = connectedPeers.get(uid)
    if (peers) {
      for (const peer of peers) {
        try { peer.send(data) } catch { /* peer already closed */ }
      }
    }
  }
}
