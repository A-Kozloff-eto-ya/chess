import { eq, or, inArray, sql } from 'drizzle-orm'
import { users, games, friendships, chatMessages, passwordResets } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id

  await db.delete(chatMessages).where(eq(chatMessages.userId, userId))
  await db.delete(passwordResets).where(eq(passwordResets.userId, userId))

  const userGames = await db.select({ id: games.id }).from(games).where(
    or(eq(games.whitePlayerId, userId), eq(games.blackPlayerId, userId))
  )
  const gameIds = userGames.map(g => g.id)

  if (gameIds.length > 0) {
    await db.delete(passwordResets).where(eq(passwordResets.userId, userId))
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
