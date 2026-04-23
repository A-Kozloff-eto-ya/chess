import type { UserInfo, FriendsResponse, FetchError } from '../../shared/types'
import { useSharedWebSocket } from './useSharedWebSocket'

export interface FriendRequestNotification {
  requestId: number
  from: UserInfo
}

interface NotificationsState {
  friendRequests: FriendRequestNotification[]
  loaded: boolean
}

interface FriendshipEvent {
  type: string | null
  userId: number | null
}

export function useNotifications() {
  const { loggedIn } = useUserSession()
  const toast = useToast()

  const notificationsState = useState<NotificationsState>('notif-state', () => ({
    friendRequests: [],
    loaded: false,
  }))

  const friendshipEvents = useState<FriendshipEvent>('notif-events', () => ({
    type: null,
    userId: null,
  }))

  const state = notificationsState.value
  const events = friendshipEvents.value

  const pendingCount = computed(() => state.friendRequests.length)

  const loadPendingRequests = async () => {
    if (state.loaded) return
    try {
      const data = await $fetch<FriendsResponse>('/api/friends')
      state.friendRequests = data.pending.map((p) => ({
        requestId: p.id,
        from: p.from,
      }))
      state.loaded = true
    } catch (e) {
      console.error('[Notifications] Failed to load requests:', e)
    }
  }

  const acceptRequest = async (requestId: number) => {
    try {
      await $fetch('/api/friends/accept', {
        method: 'POST',
        body: { requestId },
      })
      state.friendRequests = state.friendRequests.filter(
        (r) => r.requestId !== requestId
      )
      toast.add({ title: 'Friend request accepted!', color: 'success' })
    } catch (e) {
      const err = e as FetchError
      toast.add({ title: err.data?.statusMessage || 'Failed to accept', color: 'error' })
    }
  }

  const declineRequest = async (requestId: number) => {
    try {
      await $fetch('/api/friends/decline', {
        method: 'POST',
        body: { requestId },
      })
      state.friendRequests = state.friendRequests.filter(
        (r) => r.requestId !== requestId
      )
    } catch (e) {
      const err = e as FetchError
      toast.add({ title: err.data?.statusMessage || 'Failed to decline', color: 'error' })
    }
  }

  const { send, onMessage, initOnce } = useSharedWebSocket()

  const sendGameInvite = (toUserId: number, gameId: string, inviteCode: string) => {
    send({ type: 'game_invite', toUserId, gameId, inviteCode })
  }

  const onFriendshipChange = (callback: (type: string, userId: number) => void) => {
    watch(
      () => friendshipEvents.value.type,
      (type) => {
        const ev = friendshipEvents.value
        if (type && ev.userId) {
          callback(type, ev.userId)
          ev.type = null
          ev.userId = null
        }
      }
    )
  }

  const cleanup = onMessage((msg) => {
    if (msg.type === 'friend_request') {
      state.friendRequests.push({
        requestId: msg.requestId,
        from: msg.from,
      })
      events.type = 'friend_request'
      events.userId = msg.from.id
    } else if (msg.type === 'friend_accepted') {
      state.friendRequests = state.friendRequests.filter(
        (r) => r.from.id !== msg.friend.id
      )
      events.type = 'friend_accepted'
      events.userId = msg.friend.id
    } else if (msg.type === 'game_invite') {
      events.type = 'game_invite'
      events.userId = msg.from.id
    }
  })

  onMounted(async () => {
    if (loggedIn.value) {
      await loadPendingRequests()
      initOnce()
    }
  })

  watch(loggedIn, async (val) => {
    if (val) {
      state.loaded = false
      await loadPendingRequests()
      initOnce()
    } else {
      state.friendRequests = []
      state.loaded = false
    }
  })

  onUnmounted(cleanup)

  return {
    friendRequests: computed(() => state.friendRequests),
    pendingCount,
    acceptRequest,
    declineRequest,
    onNotification: onMessage,
    sendGameInvite,
    onFriendshipChange,
  }
}
