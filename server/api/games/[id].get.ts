import { games, users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const gameId = Number(getRouterParam(event, 'id'))

  if (!gameId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid game ID' })
  }

  const game = await db.select().from(games).where(eq(games.id, gameId)).then(r => r[0])

  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  }

  if (game.whitePlayerId !== session.user.id && game.blackPlayerId !== session.user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Not your game' })
  }

  const whitePlayer = game.whitePlayerId ? await db.select({
    id: users.id, username: users.username, rating: users.rating, avatar: users.avatar,
  }).from(users).where(eq(users.id, game.whitePlayerId)).then(r => r[0]) : null

  const blackPlayer = game.blackPlayerId ? await db.select({
    id: users.id, username: users.username, rating: users.rating, avatar: users.avatar,
  }).from(users).where(eq(users.id, game.blackPlayerId)).then(r => r[0]) : null

  return {
    ...game,
    moves: JSON.parse(game.moves),
    whitePlayer,
    blackPlayer,
    yourColor: game.whitePlayerId === session.user.id ? 'white' : 'black',
  }
})
