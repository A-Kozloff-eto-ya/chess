import { getOnlineUserIds } from '../../utils/peerRegistry'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const userIds: number[] = body.userIds
  if (!Array.isArray(userIds)) {
    throw createError({ statusCode: 400, statusMessage: 'userIds must be an array' })
  }
  const onlineIds = getOnlineUserIds()
  const result: Record<number, boolean> = {}
  for (const id of userIds) {
    result[id] = onlineIds.has(Number(id))
  }
  return result
})
