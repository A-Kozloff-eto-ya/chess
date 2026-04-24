import { Chess } from 'chess.js'
import { games, gameAnalyses } from '../db/schema'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { submitAnalysisToPool } from './stockfishPool'
import type { AnalyzedMove, GameMove } from '../../shared/types'

const ANALYSIS_MOVETIME = 500

const analysisProgress = new Map<number, { status: string; progress: number }>()

function mateToCp(type: 'cp' | 'mate', value: number): number {
  if (type === 'mate') {
    return value > 0 ? 100000 - value * 100 : -(100000 - Math.abs(value) * 100)
  }
  return value
}

function classifyMove(cpLoss: number): AnalyzedMove['quality'] {
  if (cpLoss <= 5) return 'best'
  if (cpLoss <= 25) return 'good'
  if (cpLoss <= 75) return 'inaccuracy'
  if (cpLoss <= 150) return 'mistake'
  return 'blunder'
}

function calculateAccuracy(cpLosses: number[]): number {
  if (cpLosses.length === 0) return 100
  const avg = cpLosses.reduce((a, b) => a + b, 0) / cpLosses.length
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * avg) - 3.1668))
}

function uciToSan(chess: Chess, uci: string): string {
  try {
    const from = uci.substring(0, 2)
    const to = uci.substring(2, 4)
    const promotion = uci.length > 4 ? uci[4] : undefined
    const move = chess.move({ from, to, promotion })
    chess.undo()
    return move.san
  } catch {
    return uci
  }
}

export function getAnalysisProgress(gameId: number) {
  return analysisProgress.get(gameId) || null
}

export async function getStoredAnalysis(gameId: number) {
  const row = await db.select().from(gameAnalyses).where(eq(gameAnalyses.gameId, gameId)).then(r => r[0])
  if (!row) return null
  const parsed = JSON.parse(row.analysis)
  return {
    id: row.id,
    gameId: row.gameId,
    status: row.status,
    analyzedMoves: parsed.moves || [],
    evaluations: parsed.evaluations || [],
    accuracy: parsed.accuracy || { white: 0, black: 0 },
    progress: row.status === 'completed' ? 100 : (parsed.progress || 0),
  }
}

export async function runAnalysis(gameId: number) {
  const stockfishPath = useRuntimeConfig().stockfishPath

  try {
    analysisProgress.set(gameId, { status: 'analyzing', progress: 0 })

    const existing = await db.select().from(gameAnalyses).where(eq(gameAnalyses.gameId, gameId)).then(r => r[0])
    if (existing?.status === 'completed') {
      analysisProgress.delete(gameId)
      return
    }
    if (existing?.status === 'analyzing') {
      return
    }

    if (!existing) {
      await db.insert(gameAnalyses).values({
        gameId,
        status: 'analyzing',
        analysis: JSON.stringify({ moves: [], evaluations: [], accuracy: { white: 0, black: 0 }, progress: 0 }),
      })
    } else {
      await db.update(gameAnalyses).set({ status: 'analyzing' }).where(eq(gameAnalyses.gameId, gameId))
    }

    const game = await db.select().from(games).where(eq(games.id, gameId)).then(r => r[0])
    if (!game?.moves) throw new Error('Game not found')

    const moveList: GameMove[] = JSON.parse(game.moves)
    if (moveList.length === 0) {
      const emptyAnalysis = JSON.stringify({ moves: [], evaluations: [0], accuracy: { white: 100, black: 100 }, progress: 100 })
      await db.update(gameAnalyses).set({ status: 'completed', analysis: emptyAnalysis }).where(eq(gameAnalyses.gameId, gameId))
      analysisProgress.delete(gameId)
      return
    }

    const chess = new Chess()
    const uciMoves: string[] = []
    const fens: string[] = [chess.fen()]

    for (const m of moveList) {
      const move = chess.move({ from: m.from, to: m.to, promotion: m.promotion })
      uciMoves.push(move.from + move.to + (move.promotion || ''))
      fens.push(chess.fen())
    }

    const evals: number[] = []
    const bestMovesUci: string[] = []

    for (let i = 0; i <= moveList.length; i++) {
      const positionCmd = i === 0
        ? 'position startpos'
        : `position startpos moves ${uciMoves.slice(0, i).join(' ')}`

      const result = await submitAnalysisToPool(stockfishPath, positionCmd, ANALYSIS_MOVETIME)
      let evalCp = result.eval ? mateToCp(result.eval.type, result.eval.value) : 0
      if (i % 2 === 1) evalCp = -evalCp
      evals.push(evalCp)
      bestMovesUci.push(result.bestmove || '')

      const progress = Math.round(((i + 1) / (moveList.length + 1)) * 100)
      analysisProgress.set(gameId, { status: 'analyzing', progress })
    }

    const analyzedMoves: AnalyzedMove[] = []
    const whiteLosses: number[] = []
    const blackLosses: number[] = []

    for (let i = 0; i < moveList.length; i++) {
      const isWhite = i % 2 === 0
      const evalBefore = evals[i]
      const evalAfter = evals[i + 1]

      let cpLoss: number
      if (isWhite) {
        cpLoss = Math.max(0, evalBefore - evalAfter)
      } else {
        cpLoss = Math.max(0, evalAfter - evalBefore)
      }
      cpLoss = Math.min(cpLoss, 2000)

      if (isWhite) whiteLosses.push(cpLoss)
      else blackLosses.push(cpLoss)

      const posChess = new Chess(fens[i])
      const bestSan = bestMovesUci[i] ? uciToSan(posChess, bestMovesUci[i]) : ''

      analyzedMoves.push({
        san: moveList[i].san,
        from: moveList[i].from,
        to: moveList[i].to,
        fen: fens[i + 1],
        evalBefore,
        evalAfter,
        quality: classifyMove(cpLoss),
        bestMove: bestSan,
        bestPv: [],
      })
    }

    const accuracy = {
      white: Math.round(calculateAccuracy(whiteLosses) * 10) / 10,
      black: Math.round(calculateAccuracy(blackLosses) * 10) / 10,
    }

    const analysisData = {
      moves: analyzedMoves,
      evaluations: evals,
      accuracy,
      progress: 100,
    }

    await db.update(gameAnalyses).set({
      status: 'completed',
      analysis: JSON.stringify(analysisData),
    }).where(eq(gameAnalyses.gameId, gameId))

    analysisProgress.delete(gameId)
  } catch (e) {
    console.error(`[Analysis] Failed for game ${gameId}:`, e)
    analysisProgress.set(gameId, { status: 'failed', progress: 0 })
    try {
      await db.update(gameAnalyses).set({ status: 'failed' }).where(eq(gameAnalyses.gameId, gameId))
    } catch {}
  }
}
