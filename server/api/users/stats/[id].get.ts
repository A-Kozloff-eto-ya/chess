import { games } from '../../../db/schema'
import { eq, or, and, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const userId = Number(getRouterParam(event, 'id'))

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user id' })
  }

  const conditions = and(
    or(
      eq(games.whitePlayerId, userId),
      eq(games.blackPlayerId, userId),
    ),
    eq(games.status, 'completed'),
  )

  const stats = await db
    .select({
      total: sql<number>`count(*)`,
      wins: sql<number>`count(*) filter (where (
        (${games.whitePlayerId} = ${userId} and ${games.result} = '1-0') or
        (${games.blackPlayerId} = ${userId} and ${games.result} = '0-1')
      ))`,
      losses: sql<number>`count(*) filter (where (
        (${games.whitePlayerId} = ${userId} and ${games.result} = '0-1') or
        (${games.blackPlayerId} = ${userId} and ${games.result} = '1-0')
      ))`,
      draws: sql<number>`count(*) filter (where ${games.result} = '1/2-1/2')`,
    })
    .from(games)
    .where(conditions)

  const row = stats[0]
  const total = Number(row?.total || 0)
  const wins = Number(row?.wins || 0)

  return {
    gamesPlayed: total,
    wins,
    losses: Number(row?.losses || 0),
    draws: Number(row?.draws || 0),
    winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
  }
})
