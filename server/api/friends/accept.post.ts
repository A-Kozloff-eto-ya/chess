import { z } from 'zod'
import { friendships, users } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import type { UserInfo } from '../../../shared/types'

const acceptSchema = z.object({ requestId: z.number() })

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parsed = acceptSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const { requestId } = parsed.data

    const request = await db.select().from(friendships).where(and(
    eq(friendships.id, requestId),
    eq(friendships.addresseeId, session.user.id),
    eq(friendships.status, 'pending'),
  )).then(r => r[0])

  if (!request) {
    throw createError({ statusCode: 404, statusMessage: 'Friend request not found' })
  }

  await db.update(friendships).set({
    status: 'accepted',
    respondedAt: new Date(),
  }).where(eq(friendships.id, requestId)).execute()

  const accepter = await db.select({ id: users.id, username: users.username, rating: users.rating, avatar: users.avatar })
    .from(users).where(eq(users.id, session.user.id)).then(r => r[0] as UserInfo | undefined)
  if (accepter) {
    sendToUser(request.requesterId, {
      type: 'friend_accepted',
      friend: accepter,
    })
  }

  return { success: true }
})
