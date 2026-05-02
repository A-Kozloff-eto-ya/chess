import { z } from 'zod'
import { friendships } from '../../db/schema'
import { eq, and } from 'drizzle-orm'

const cancelSchema = z.object({ requestId: z.number() })

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parsed = cancelSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const { requestId } = parsed.data

  const request = await db.select({ addresseeId: friendships.addresseeId }).from(friendships).where(and(
    eq(friendships.id, requestId),
    eq(friendships.requesterId, session.user.id),
    eq(friendships.status, 'pending'),
  )).then(r => r[0])

  if (!request) {
    throw createError({ statusCode: 404, statusMessage: 'Friend request not found' })
  }

  await db.delete(friendships).where(eq(friendships.id, requestId)).execute()

  sendToUser(request.addresseeId, { type: 'friend_request_cancelled', by: session.user.id })

  return { success: true }
})
