import { z } from 'zod'
import { friendships } from '../../db/schema'
import { eq, or, and } from 'drizzle-orm'

const removeSchema = z.object({ userId: z.number() })

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parsed = removeSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const { userId } = parsed.data

  await db.delete(friendships).where(or(
    and(eq(friendships.requesterId, session.user.id), eq(friendships.addresseeId, userId)),
    and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, session.user.id)),
  )).execute()

  sendToUser(userId, { type: 'friend_removed', by: session.user.id })

  return { success: true }
})
