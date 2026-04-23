import { Chess } from 'chess.js'
import { z } from 'zod'
import { submitToPool } from '../../utils/stockfishPool'

const engineSchema = z.object({
  sanMoves: z.string().min(1).optional(),
  uciMoves: z.string().regex(/^[a-h1-8 @]+(?:\s+[a-h1-8 @]+)*$/).optional(),
  movetime: z.number().int().min(100).max(5000).default(1000),
  elo: z.number().int().min(100).max(3500).optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = engineSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const { sanMoves, uciMoves, movetime, elo } = parsed.data
  const stockfishPath = useRuntimeConfig().stockfishPath

  let positionCmd = 'position startpos'
  if (sanMoves) {
    try {
      const chess = new Chess()
      const moveList = sanMoves.split(' ').filter(Boolean)
      const uciList: string[] = []
      for (const san of moveList) {
        const move = chess.move(san)
        uciList.push(move.from + move.to + (move.promotion || ''))
      }
      if (uciList.length > 0) {
        positionCmd = `position startpos moves ${uciList.join(' ')}`
      }
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'Invalid SAN moves' })
    }
  } else if (uciMoves) {
    positionCmd = `position startpos moves ${uciMoves}`
  }

  try {
    return await submitToPool(stockfishPath, positionCmd, movetime, elo)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Engine error'
    const status = message.includes('queue is full') ? 503 : 500
    throw createError({ statusCode: status, statusMessage: message })
  }
})
