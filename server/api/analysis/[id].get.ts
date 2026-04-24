import { games } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { getStoredAnalysis, getAnalysisProgress } from '../../utils/analysis'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const gameId = Number(getRouterParam(event, 'id'))
  if (!gameId) throw createError({ statusCode: 400, statusMessage: 'Invalid game ID' })

  const game = await db.select().from(games).where(eq(games.id, gameId)).then(r => r[0])
  if (!game) throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  if (game.whitePlayerId !== session.user.id && game.blackPlayerId !== session.user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Not your game' })
  }

  const stored = await getStoredAnalysis(gameId)
  if (!stored) {
    throw createError({ statusCode: 404, statusMessage: 'Analysis not found. POST to trigger.' })
  }

  if (stored.status === 'analyzing') {
    const progress = getAnalysisProgress(gameId)
    return { ...stored, progress: progress?.progress ?? 0 }
  }

  return stored
})
