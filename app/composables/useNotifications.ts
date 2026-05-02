import type { UserInfo, FriendsResponse, FetchError } from '../../shared/types'
import type { NotificationsState, FriendshipEvent, FriendRequestNotification } from '../types/notifications'
import { useSharedWebSocket } from './useSharedWebSocket'

export type { FriendRequestNotification, FriendshipEvent } from '../types/notifications'

export function useNotifications() {
  const { loggedIn } = useUserSession()
  const toast = useToast()

  const notificationsState = useState<NotificationsState>('notif-state', () => ({
    friendRequests: [],
    loaded: false,
  }))
  const friendshipEvents = useState<FriendshipEvent>('notif-events', () => ({
    id: 0,
    type: null,
    userId: null,
  }))

  const state = notificationsState.value
  const pendingCount = computed(() => state.friendRequests.length)

  const loadPendingRequests = async () => {
    if (state.loaded) return
    try {
      const data = await $fetch<FriendsResponse>('/api/friends')
      state.friendRequests = data.pending.map((p: { id: number; from: UserInfo }) => ({
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
        (r: FriendRequestNotification) => r.requestId !== requestId
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
        (r: FriendRequestNotification) => r.requestId !== requestId
      )
    } catch (e) {
      const err = e as FetchError
      toast.add({ title: err.data?.statusMessage || 'Failed to decline', color: 'error' })
    }
  }

  const { send } = useSharedWebSocket()

  const sendGameInvite = (toUserId: number, gameId: string, inviteCode: string) => {
    send({ type: 'game_invite', toUserId, gameId, inviteCode })
  }

  const onFriendshipChange = (callback: (type: string, userId: number, data?: any) => void) => {
    watch(
      () => friendshipEvents.value.id,
      () => {
        const ev = friendshipEvents.value
        if (ev.type && ev.userId) {
          callback(ev.type, ev.userId, ev.data)
        }
      }
    )
  }

  return {
    friendRequests: computed(() => state.friendRequests),
    friendshipEvents,
    pendingCount,
    acceptRequest,
    declineRequest,
    sendGameInvite,
    onFriendshipChange,
  }
}
