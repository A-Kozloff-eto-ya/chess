import { z } from 'zod'
import { friendships, users } from '../../db/schema'
import { eq, or, and } from 'drizzle-orm'
import type { UserInfo } from '../../../shared/types'

const requestSchema = z.object({ userId: z.number() })

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parsed = requestSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const { userId } = parsed.data

  if (userId === session.user.id) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot add yourself as a friend' })
  }

    const existing = await db.select().from(friendships).where(and(
    or(
      and(eq(friendships.requesterId, session.user.id), eq(friendships.addresseeId, userId)),
      and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, session.user.id)),
    ),
  )).then(r => r[0])

  if (existing) {
    if (existing.status === 'pending') {
      throw createError({ statusCode: 409, statusMessage: 'Friend request already exists' })
    }

    const [request] = await db.update(friendships).set({
      requesterId: session.user.id,
      addresseeId: userId,
      status: 'pending',
      respondedAt: null,
    }).where(eq(friendships.id, existing.id)).returning()

    const fromUser = await db.select({ id: users.id, username: users.username, rating: users.rating, avatar: users.avatar })
      .from(users).where(eq(users.id, session.user.id)).then(r => r[0] as UserInfo | undefined)
    if (fromUser && request) {
      sendToUser(userId, {
        type: 'friend_request',
        requestId: request.id,
        from: fromUser,
      })
    }

    return { success: true }
  }

  const [request] = await db.insert(friendships).values({
    requesterId: session.user.id,
    addresseeId: userId,
    status: 'pending',
  }).returning()

  const fromUser = await db.select({ id: users.id, username: users.username, rating: users.rating, avatar: users.avatar })
    .from(users).where(eq(users.id, session.user.id)).then(r => r[0] as UserInfo | undefined)
  if (fromUser && request) {
    sendToUser(userId, {
      type: 'friend_request',
      requestId: request.id,
      from: fromUser,
    })
  }

  return { success: true }
})
