import type { GameAnalysis } from '~/types'
import { Chess } from 'chess.js'

export function useAnalysis(gameId: string) {
  const analysis = ref<GameAnalysis | null>(null)
  const status = ref<'idle' | 'loading' | 'analyzing' | 'completed' | 'failed'>('idle')
  const progress = ref(0)
  const currentMoveIndex = ref(0)

  const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  const positions = computed(() => {
    if (!analysis.value?.analyzedMoves?.length) return [STARTING_FEN]
    const fens = [STARTING_FEN]
    for (const move of analysis.value.analyzedMoves) {
      fens.push(move.fen)
    }
    return fens
  })

  const totalMoves = computed(() => analysis.value?.analyzedMoves?.length ?? 0)

  const currentEval = computed(() => {
    if (!analysis.value?.evaluations) return 0
    return analysis.value.evaluations[currentMoveIndex.value] ?? 0
  })

  const currentAnalyzedMove = computed(() => {
    if (!analysis.value?.analyzedMoves) return null
    if (currentMoveIndex.value === 0) return null
    return analysis.value.analyzedMoves[currentMoveIndex.value - 1] ?? null
  })

  const whiteAccuracy = computed(() => analysis.value?.accuracy?.white ?? 0)
  const blackAccuracy = computed(() => analysis.value?.accuracy?.black ?? 0)

  let pollTimer: ReturnType<typeof setInterval> | null = null

  const startAnalysis = async () => {
    status.value = 'loading'
    try {
      const res = await $fetch<GameAnalysis>(`/api/analysis/${gameId}`, { method: 'POST' })
      if (res.status === 'completed') {
        analysis.value = res
        status.value = 'completed'
        currentMoveIndex.value = positions.value.length - 1
        return
      }
      status.value = 'analyzing'
      progress.value = res.progress ?? 0
      startPolling()
    } catch {
      status.value = 'failed'
    }
  }

  const startPolling = () => {
    if (pollTimer) return
    pollTimer = setInterval(async () => {
      try {
        const res = await $fetch<GameAnalysis>(`/api/analysis/${gameId}`)
        status.value = res.status as typeof status.value
        progress.value = res.progress ?? 0
        if (res.status === 'completed') {
          analysis.value = res
          currentMoveIndex.value = positions.value.length - 1
          stopPolling()
        } else if (res.status === 'failed') {
          stopPolling()
        }
      } catch {
        stopPolling()
        status.value = 'failed'
      }
    }, 2000)
  }

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  const goToMove = (index: number) => {
    currentMoveIndex.value = Math.max(0, Math.min(index, positions.value.length - 1))
  }
  const goNext = () => goToMove(currentMoveIndex.value + 1)
  const goPrev = () => goToMove(currentMoveIndex.value - 1)
  const goFirst = () => goToMove(0)
  const goLast = () => goToMove(positions.value.length - 1)

  useBoardNavigation({ goNext, goPrev, goFirst, goLast })

  onMounted(() => {
    startAnalysis()
  })

  onUnmounted(() => {
    stopPolling()
  })

  return {
    analysis,
    status,
    progress,
    currentMoveIndex,
    positions,
    totalMoves,
    currentEval,
    currentAnalyzedMove,
    whiteAccuracy,
    blackAccuracy,
    goToMove,
    goNext,
    goPrev,
    goFirst,
    goLast,
    startAnalysis,
  }
}
