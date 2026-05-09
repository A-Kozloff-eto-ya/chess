import { z } from 'zod'
import { eq, or, inArray } from 'drizzle-orm'
import { users, games, friendships, chatMessages, passwordResets } from '../../db/schema'

const deleteSchema = z.object({
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id

  const body = await readBody(event)
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Password is required' })
  }

  const user = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).then(r => r[0])
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  if (user.passwordHash) {
    const valid = await verifyPassword(user.passwordHash, parsed.data.password)
    if (!valid) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid password' })
    }
  }

  await db.delete(chatMessages).where(eq(chatMessages.userId, userId))
  await db.delete(passwordResets).where(eq(passwordResets.userId, userId))

  const userGames = await db.select({ id: games.id }).from(games).where(
    or(eq(games.whitePlayerId, userId), eq(games.blackPlayerId, userId))
  )
  const gameIds = userGames.map(g => g.id)

  if (gameIds.length > 0) {
    await db.delete(chatMessages).where(inArray(chatMessages.gameId, gameIds)).catch(() => {})
    await db.delete(games).where(inArray(games.id, gameIds))
  }

  await db.delete(friendships).where(
    or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))
  )
  await db.delete(users).where(eq(users.id, userId))

  await clearUserSession(event)
  return { success: true }
})
