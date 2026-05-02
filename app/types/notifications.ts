import type { UserInfo } from '../../shared/types'

export interface FriendRequestNotification {
  requestId: number
  from: UserInfo
}

export interface NotificationsState {
  friendRequests: FriendRequestNotification[]
  loaded: boolean
}

export interface FriendshipEvent {
  id: number
  type: string | null
  userId: number | null
  data?: any
}
