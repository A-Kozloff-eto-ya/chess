import { friendships, users } from '../../db/schema'
import { eq, or, and } from 'drizzle-orm'

interface FriendRow {
  friendship: typeof friendships.$inferSelect
  friend: { id: number | null; username: string | null; rating: number | null; avatar: string | null }
}

interface PendingRow {
  id: number
  requesterId: number
  requesterUsername: string | null
  requesterRating: number | null
  requesterAvatar: string | null
}

interface SentRow {
  id: number
  addresseeId: number
  addresseeUsername: string | null
  addresseeRating: number | null
  addresseeAvatar: string | null
}

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

    const accepted = await db.select({
    friendship: friendships,
    friend: {
      id: users.id,
      username: users.username,
      rating: users.rating,
      avatar: users.avatar,
    },
  }).from(friendships)
    .leftJoin(users, or(
      eq(friendships.requesterId, users.id),
      eq(friendships.addresseeId, users.id),
    ))
    .where(and(
      or(
        eq(friendships.requesterId, session.user.id),
        eq(friendships.addresseeId, session.user.id),
      ),
      eq(friendships.status, 'accepted'),
    )) as FriendRow[]

  const friends = accepted
    .filter((row) => row.friend.id !== session.user.id)
    .map((row) => row.friend)

  const pendingRows = await db.select({
    id: friendships.id,
    requesterId: friendships.requesterId,
    requesterUsername: users.username,
    requesterRating: users.rating,
    requesterAvatar: users.avatar,
  }).from(friendships)
    .innerJoin(users, eq(friendships.requesterId, users.id))
    .where(and(
      eq(friendships.addresseeId, session.user.id),
      eq(friendships.status, 'pending'),
    )) as PendingRow[]

  const pending = pendingRows.map((row) => ({
    id: row.id,
    requesterId: row.requesterId,
    from: {
      id: row.requesterId,
      username: row.requesterUsername,
      rating: row.requesterRating,
      avatar: row.requesterAvatar,
    },
  }))

  const sentRows = await db.select({
    id: friendships.id,
    addresseeId: friendships.addresseeId,
    addresseeUsername: users.username,
    addresseeRating: users.rating,
    addresseeAvatar: users.avatar,
  }).from(friendships)
    .innerJoin(users, eq(friendships.addresseeId, users.id))
    .where(and(
      eq(friendships.requesterId, session.user.id),
      eq(friendships.status, 'pending'),
    )) as SentRow[]

  const sent = sentRows.map((row) => ({
    id: row.id,
    to: {
      id: row.addresseeId,
      username: row.addresseeUsername,
      rating: row.addresseeRating,
      avatar: row.addresseeAvatar,
    },
  }))

  return { friends, pending, sent }
})
