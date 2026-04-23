import { z } from 'zod'
import { games, users } from '../../db/schema'
import { eq } from 'drizzle-orm'

const createGameSchema = z.object({
  opponentId: z.number().optional(),
  timeControl: z.string().default('10+0'),
  color: z.enum(['white', 'black', 'random']).default('random'),
})

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parsed = createGameSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const { opponentId, timeControl, color } = parsed.data

  if (opponentId === session.user.id) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot play against yourself' })
  }

  let whitePlayerId: number | null = null
  let blackPlayerId: number | null = null
  let status: 'waiting' | 'active' = 'waiting'

  if (opponentId) {
    const opponent = await db.select().from(users).where(eq(users.id, opponentId)).then(r => r[0])
    if (!opponent) {
      throw createError({ statusCode: 404, statusMessage: 'Opponent not found' })
    }

    if (color === 'black') {
      whitePlayerId = opponentId
      blackPlayerId = session.user.id
    } else if (color === 'random') {
      const playWhite = Math.random() > 0.5
      whitePlayerId = playWhite ? session.user.id : opponentId
      blackPlayerId = playWhite ? opponentId : session.user.id
    } else {
      whitePlayerId = session.user.id
      blackPlayerId = opponentId
    }
    status = 'active'
  } else {
    if (color === 'black') {
      blackPlayerId = session.user.id
    } else {
      whitePlayerId = session.user.id
    }
  }

  const defaultFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  const game = await db.insert(games).values({
    whitePlayerId,
    blackPlayerId,
    fen: defaultFen,
    timeControl,
    status,
    inviteCode: generateInviteCode(),
  }).returning().then(r => r[0])

  return { gameId: game.id, inviteCode: game.inviteCode }
})
