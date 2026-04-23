import { useSharedWebSocket } from './useSharedWebSocket'

export function useOnlineUsers() {
  const onlineUsers = useState<Map<number, { online: boolean; lastSeenAt: string | null }>>('online-users', () => new Map())

  const { onMessage } = useSharedWebSocket()

  onMessage((msg) => {
    if (msg.type === 'user_online') {
      const next = new Map(onlineUsers.value)
      next.set(msg.userId, { online: true, lastSeenAt: null })
      onlineUsers.value = next
    } else if (msg.type === 'user_offline') {
      const next = new Map(onlineUsers.value)
      const existing = next.get(msg.userId)
      next.set(msg.userId, { online: false, lastSeenAt: existing?.lastSeenAt ?? new Date().toISOString() })
      onlineUsers.value = next
    }
  })

  const fetchOnlineStatus = async (userIds: number[]) => {
    if (userIds.length === 0) return
    try {
      const result = await $fetch<Record<string, { online: boolean; lastSeenAt: string | null }>>('/api/users/online-status', {
        method: 'POST',
        body: { userIds }
      })
      const next = new Map(onlineUsers.value)
      for (const [id, status] of Object.entries(result)) {
        next.set(Number(id), status)
      }
      onlineUsers.value = next
    } catch (e) {
      console.error('[OnlineUsers] fetchOnlineStatus failed:', e)
    }
  }

  const isOnline = (userId: number) => onlineUsers.value.get(userId)?.online === true
  const getStatus = (userId: number) => onlineUsers.value.get(userId)

  return { onlineUsers: readonly(onlineUsers), isOnline, getStatus, fetchOnlineStatus }
}
