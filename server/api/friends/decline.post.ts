import { z } from 'zod'
import { friendships } from '../../db/schema'
import { eq, and } from 'drizzle-orm'

const declineSchema = z.object({ requestId: z.number() })

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parsed = declineSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const { requestId } = parsed.data

  const request = await db.select({ requesterId: friendships.requesterId }).from(friendships).where(and(
    eq(friendships.id, requestId),
    eq(friendships.addresseeId, session.user.id),
    eq(friendships.status, 'pending'),
  )).then(r => r[0])

  if (!request) {
    throw createError({ statusCode: 404, statusMessage: 'Friend request not found' })
  }

  await db.update(friendships).set({
    status: 'declined',
    respondedAt: new Date(),
  }).where(eq(friendships.id, requestId)).execute()

  sendToUser(request.requesterId, { type: 'friend_declined', by: session.user.id })

  return { success: true }
})
