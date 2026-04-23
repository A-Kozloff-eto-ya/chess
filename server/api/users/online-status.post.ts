import { getOnlineUserIds } from '../../utils/peerRegistry'
import { users } from '../../db/schema'
import { inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const userIds: number[] = body.userIds
  if (!Array.isArray(userIds)) {
    throw createError({ statusCode: 400, statusMessage: 'userIds must be an array' })
  }
  const onlineIds = getOnlineUserIds()
  const offlineIds = userIds.filter(id => !onlineIds.has(Number(id)))
  const result: Record<number, { online: boolean; lastSeenAt: string | null }> = {}
  for (const id of userIds) {
    result[id] = { online: onlineIds.has(Number(id)), lastSeenAt: null }
  }
  if (offlineIds.length > 0) {
    const rows = await db.select({ id: users.id, lastSeenAt: users.lastSeenAt })
      .from(users)
      .where(inArray(users.id, offlineIds))
    for (const row of rows) {
      result[row.id] = { online: false, lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null }
    }
  }
  return result
})
