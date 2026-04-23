import { z } from 'zod'
import { games } from '../../db/schema'
import { eq } from 'drizzle-orm'

const joinSchema = z.object({
  inviteCode: z.string().length(6),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parsed = joinSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid invite code' })
  }

  const { inviteCode } = parsed.data

  const game = await db.select().from(games).where(eq(games.inviteCode, inviteCode)).then(r => r[0])

  if (!game) {
    throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  }

  if (game.status !== 'waiting') {
    throw createError({ statusCode: 400, statusMessage: 'Game is no longer waiting for a player' })
  }

  const isCreator = game.whitePlayerId === session.user.id || game.blackPlayerId === session.user.id
  if (isCreator) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot join your own game' })
  }

  const update: Partial<typeof games.$inferInsert> = { status: 'active' }
  if (!game.whitePlayerId) {
    update.whitePlayerId = session.user.id
  } else {
    update.blackPlayerId = session.user.id
  }

  await db.update(games).set(update).where(eq(games.id, game.id))

  return { gameId: game.id }
})
