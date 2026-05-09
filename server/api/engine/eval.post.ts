import { z } from 'zod'
import { submitEvalToPool } from '../../utils/stockfishPool'
import { sanToUciMoves } from '../../utils/chess'

const evalSchema = z.object({
  sanMoves: z.string().min(1).optional(),
  uciMoves: z.string().regex(/^[a-h1-8 @]+(?:\s+[a-h1-8 @]+)*$/).optional(),
  movetime: z.number().int().min(100).max(5000).default(500),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = evalSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const { sanMoves, uciMoves, movetime } = parsed.data
  const stockfishPath = useRuntimeConfig().stockfishPath

  let positionCmd = 'position startpos'
  if (sanMoves) {
    const result = sanToUciMoves(sanMoves)
    if (result.error) {
      throw createError({ statusCode: 400, statusMessage: result.error })
    }
    positionCmd = result.positionCmd
  } else if (uciMoves) {
    positionCmd = `position startpos moves ${uciMoves}`
  }

  try {
    return await submitEvalToPool(stockfishPath, positionCmd, movetime)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Engine error'
    const status = message.includes('queue is full') ? 503 : 500
    throw createError({ statusCode: status, statusMessage: message })
  }
})
