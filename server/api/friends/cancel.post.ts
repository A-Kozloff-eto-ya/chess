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

  await db.delete(friendships).where(and(
    eq(friendships.id, requestId),
    eq(friendships.requesterId, session.user.id),
    eq(friendships.status, 'pending'),
  )).execute()

  return { success: true }
})
