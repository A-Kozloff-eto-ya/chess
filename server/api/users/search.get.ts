import { users } from '../../db/schema'
import { ilike, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q || '')
  const page = Number(query.page || 1)
  const limit = Number(query.limit || 10)

  if (!q || q.length < 2) {
    return { users: [], total: 0, page }
  }

    const results = await db.select({
    id: users.id,
    username: users.username,
    avatar: users.avatar,
    rating: users.rating,
  }).from(users).where(ilike(users.username, `${q}%`)).limit(limit).offset((page - 1) * limit)

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(users).where(ilike(users.username, `${q}%`))

  return { users: results, total: Number(countResult[0].count), page }
})
