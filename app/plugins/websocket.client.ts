import type { UserInfo, FriendsResponse } from '../../shared/types'
import type { NotificationsState, FriendshipEvent } from '../types/notifications'

export default defineNuxtPlugin(() => {
  const { on, initOnce } = useSharedWebSocket()
  const { loggedIn } = useUserSession()

  const notifState = useState<NotificationsState>('notif-state', () => ({
    friendRequests: [],
    loaded: false,
  }))

  const friendshipEvents = useState<FriendshipEvent>('notif-events', () => ({
    id: 0,
    type: null,
    userId: null,
  }))

  const onlineUsers = useState<Map<number, { online: boolean; lastSeenAt: string | null }>>('online-users', () => new Map())

  const nextEventId = () => {
    const next = friendshipEvents.value.id + 1
    friendshipEvents.value = { ...friendshipEvents.value, id: next }
    return next
  }

  on('friend_request', (msg: { requestId: number; from: UserInfo }) => {
    const state = notifState.value
    if (!state.friendRequests.some((r: { requestId: number }) => r.requestId === msg.requestId)) {
      state.friendRequests.push({ requestId: msg.requestId, from: msg.from })
    }
    friendshipEvents.value = {
      id: nextEventId(),
      type: 'friend_request',
      userId: msg.from.id,
      data: msg,
    }
  })

  on('friend_accepted', (msg: { friend: UserInfo }) => {
    const state = notifState.value
    state.friendRequests = state.friendRequests.filter(
      (r: { from: { id: number } }) => r.from.id !== msg.friend.id
    )
    friendshipEvents.value = {
      id: nextEventId(),
      type: 'friend_accepted',
      userId: msg.friend.id,
      data: msg,
    }
  })

  on('game_invite', (msg: { from: UserInfo; gameId: string; inviteCode: string }) => {
    friendshipEvents.value = {
      id: nextEventId(),
      type: 'game_invite',
      userId: msg.from.id,
      data: msg,
    }
  })

  on('user_online', (msg: { userId: number }) => {
    const next = new Map(onlineUsers.value)
    next.set(msg.userId, { online: true, lastSeenAt: null })
    onlineUsers.value = next
  })

  on('user_offline', (msg: { userId: number }) => {
    const next = new Map(onlineUsers.value)
    const existing = next.get(msg.userId)
    next.set(msg.userId, { online: false, lastSeenAt: existing?.lastSeenAt ?? new Date().toISOString() })
    onlineUsers.value = next
  })

  const loadPendingRequests = async () => {
    const state = notifState.value
    if (state.loaded) return
    try {
      const data = await $fetch<FriendsResponse>('/api/friends')
      state.friendRequests = data.pending.map((p: { id: number; from: UserInfo }) => ({
        requestId: p.id,
        from: p.from,
      }))
      state.loaded = true
    } catch (e) {
      console.error('[WS Plugin] Failed to load requests:', e)
    }
  }

  if (loggedIn.value) {
    initOnce()
    loadPendingRequests()
  }

  watch(loggedIn, async (val) => {
    if (val) {
      notifState.value.loaded = false
      initOnce()
      await loadPendingRequests()
    } else {
      notifState.value.friendRequests = []
      notifState.value.loaded = false
    }
  })
})
