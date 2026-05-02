export function useOnlineUsers() {
  const onlineUsers = useState<Map<number, { online: boolean; lastSeenAt: string | null }>>('online-users', () => new Map())

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
