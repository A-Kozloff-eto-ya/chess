import { games, gameAnalyses } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { runAnalysis, getStoredAnalysis, getAnalysisProgress } from '../../utils/analysis'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const gameId = Number(getRouterParam(event, 'id'))
  if (!gameId) throw createError({ statusCode: 400, statusMessage: 'Invalid game ID' })

  const game = await db.select().from(games).where(eq(games.id, gameId)).then(r => r[0])
  if (!game) throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  if (game.whitePlayerId !== session.user.id && game.blackPlayerId !== session.user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Not your game' })
  }
  if (game.status !== 'completed') {
    throw createError({ statusCode: 400, statusMessage: 'Game is not completed' })
  }

  const stored = await getStoredAnalysis(gameId)
  if (stored?.status === 'completed') return stored
  if (stored?.status === 'analyzing') {
    const progress = getAnalysisProgress(gameId)
    return { ...stored, progress: progress?.progress ?? 0 }
  }

  runAnalysis(gameId).catch(console.error)

  return { id: 0, gameId, status: 'pending', analyzedMoves: [], evaluations: [], accuracy: { white: 0, black: 0 }, progress: 0 }
})
