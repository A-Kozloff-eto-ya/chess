import { Chess } from 'chess.js'
import type { AnalyzedMove } from '~/types'

interface ParsedMove {
  from: string
  to: string
  promotion?: string
  san: string
}

interface EngineAnalysisResult {
  analyzedMoves: AnalyzedMove[]
  evaluations: number[]
  accuracy: { white: number; black: number }
}

export function useEngineAnalysis() {
  const analysisStatus = ref<'idle' | 'analyzing' | 'completed' | 'failed'>('idle')
  const progress = ref(0)
  const analysis = ref<EngineAnalysisResult | null>(null)

  const startEngineAnalysis = async (moves: ParsedMove[]) => {
    if (!moves?.length) return

    analysisStatus.value = 'analyzing'
    progress.value = 0
    analysis.value = null

    const totalSteps = moves.length + 1
    let completed = 0

    try {
      const chess = new Chess()
      const fens: string[] = [chess.fen()]
      for (const m of moves) {
        chess.move({ from: m.from, to: m.to, promotion: m.promotion })
        fens.push(chess.fen())
      }

      const evals: number[] = []

      for (let i = 0; i <= moves.length; i++) {
        const sanMovesStr = i === 0 ? '' : moves.slice(0, i).map(m => m.san).join(' ')
        try {
          const result = await $fetch<{ eval: { type: 'cp' | 'mate'; value: number } | null }>('/api/engine/eval', {
            method: 'POST',
            body: { sanMoves: sanMovesStr || undefined, movetime: 500 },
          })
          let evalCp = 0
          if (result.eval) {
            if (result.eval.type === 'mate') {
              evalCp = result.eval.value > 0 ? 100000 - result.eval.value * 100 : -(100000 - Math.abs(result.eval.value) * 100)
            } else {
              evalCp = result.eval.value
            }
          }
          if (i % 2 === 1) evalCp = -evalCp
          evals.push(evalCp)
        } catch {
          evals.push(0)
        }

        completed++
        progress.value = Math.round((completed / totalSteps) * 100)
      }

      const analyzedMoves: AnalyzedMove[] = []
      const whiteAccuracies: number[] = []
      const blackAccuracies: number[] = []

      const winningChances = (cp: number) => 2 / (1 + Math.exp(-0.00368208 * cp)) - 1
      const wcLossToAccuracy = (wcLoss: number) => Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * wcLoss * 100) - 3.1668))
      const DECISIVE = 10000

      for (let i = 0; i < moves.length; i++) {
        const isWhite = i % 2 === 0
        const evalBefore = evals[i]!
        const evalAfter = evals[i + 1]!

        const wcBefore = winningChances(evalBefore)
        const wcAfter = winningChances(evalAfter)
        const wcLoss = isWhite
          ? Math.max(0, wcBefore - wcAfter)
          : Math.max(0, wcAfter - wcBefore)

        if (Math.abs(evalBefore) < DECISIVE) {
          const acc = wcLossToAccuracy(wcLoss)
          if (isWhite) whiteAccuracies.push(acc)
          else blackAccuracies.push(acc)
        }

        const quality: AnalyzedMove['quality'] = wcLoss < 0.02
          ? (Math.abs(evalBefore) < DECISIVE && evalBefore * evalAfter < 0 && wcLoss < 0.01 ? 'brilliant' : 'best')
          : wcLoss < 0.1 ? 'good'
          : wcLoss < 0.2 ? 'inaccuracy'
          : wcLoss < 0.3 ? 'mistake'
          : 'blunder'

        analyzedMoves.push({
          san: moves[i]!.san,
          from: moves[i]!.from,
          to: moves[i]!.to,
          fen: fens[i + 1]!,
          evalBefore,
          evalAfter,
          quality,
          bestMove: '',
          bestPv: [],
        })
      }

      const accuracy = {
        white: whiteAccuracies.length > 0 ? Math.round(whiteAccuracies.reduce((a, b) => a + b, 0) / whiteAccuracies.length * 10) / 10 : 100,
        black: blackAccuracies.length > 0 ? Math.round(blackAccuracies.reduce((a, b) => a + b, 0) / blackAccuracies.length * 10) / 10 : 100,
      }

      analysis.value = { analyzedMoves, evaluations: evals, accuracy }
      analysisStatus.value = 'completed'
    } catch {
      analysisStatus.value = 'failed'
    }
  }

  const resetAnalysis = () => {
    analysis.value = null
    analysisStatus.value = 'idle'
    progress.value = 0
  }

  return {
    analysisStatus,
    progress,
    analysis,
    startEngineAnalysis,
    resetAnalysis,
  }
}
