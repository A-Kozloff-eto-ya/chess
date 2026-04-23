import { games, users, gameStatusEnum } from '../../db/schema'
import { eq, or, and, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const query = getQuery(event)
  const page = Number(query.page || 1)
  const limit = Number(query.limit || 20)
  const status = query.status as typeof gameStatusEnum.enumValues[number] | undefined
  const username = query.username as string | undefined

  let targetUserId = session.user.id

  if (username && username !== session.user.username) {
    const targetUser = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .then(r => r[0])
    if (!targetUser) {
      return { games: [], total: 0, page }
    }
    targetUserId = targetUser.id
  }

  let conditions = or(
    eq(games.whitePlayerId, targetUserId),
    eq(games.blackPlayerId, targetUserId),
  )

  const safeStatus = status ?? 'completed'
  conditions = and(conditions, eq(games.status, safeStatus))!

  const results = await db.select().from(games)
    .where(conditions)
    .orderBy(desc(games.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(games).where(conditions)

  return { games: results, total: Number(countResult[0]?.count ?? 0), page }
})
