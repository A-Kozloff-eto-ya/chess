import { friendships, users } from '../../db/schema'
import { ilike, or, and, eq, ne, inArray, notInArray, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const query = getQuery(event)
  const q = String(query.q || '')
  const limit = Number(query.limit || 20)

  if (!q || q.length < 2) {
    return { results: [] }
  }

  const friendIdsRaw = await db.select({
    friendId: sql<number>`CASE WHEN ${friendships.requesterId} = ${session.user.id} THEN ${friendships.addresseeId} ELSE ${friendships.requesterId} END`,
  }).from(friendships)
    .where(and(
      or(
        eq(friendships.requesterId, session.user.id),
        eq(friendships.addresseeId, session.user.id),
      ),
      eq(friendships.status, 'accepted'),
    ))

  const friendIds = friendIdsRaw.map(r => r.friendId)

  if (friendIds.length > 0) {
    const friendResults = await db.select({
      id: users.id,
      username: users.username,
      avatar: users.avatar,
      rating: users.rating,
    }).from(users)
      .where(and(
        ilike(users.username, `%${q}%`),
        ne(users.id, session.user.id),
        inArray(users.id, friendIds),
      ))
      .limit(limit)

    const otherResults = await db.select({
      id: users.id,
      username: users.username,
      avatar: users.avatar,
      rating: users.rating,
    }).from(users)
      .where(and(
        ilike(users.username, `%${q}%`),
        ne(users.id, session.user.id),
        notInArray(users.id, friendIds),
      ))
      .limit(Math.max(0, limit - friendResults.length))

    return { results: [...friendResults.map(r => ({ ...r, isFriend: true })), ...otherResults.map(r => ({ ...r, isFriend: false }))] }
  }

  const results = await db.select({
    id: users.id,
    username: users.username,
    avatar: users.avatar,
    rating: users.rating,
  }).from(users)
    .where(and(
      ilike(users.username, `%${q}%`),
      ne(users.id, session.user.id),
    ))
    .limit(limit)

  return { results: results.map(r => ({ ...r, isFriend: false })) }
})
