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

    await db.update(friendships).set({
    status: 'declined',
    respondedAt: new Date(),
  }).where(and(
    eq(friendships.id, requestId),
    eq(friendships.addresseeId, session.user.id),
    eq(friendships.status, 'pending'),
  )).execute()

  return { success: true }
})
