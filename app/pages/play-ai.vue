<template>
  <div ref="gameContainer" class="flex h-full gap-4 lg:flex-row max-w-7xl mx-auto">
    <div class="flex flex-1 flex-col items-center gap-2 min-w-0 min-h-0">
      <div class="flex w-full items-center justify-between" :style="{ maxWidth: boardSize + 'px' }">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-bot" class="size-5 text-blue-400" />
          <span class="font-semibold">Stockfish AI</span>
          <span class="text-sm text-gray-400">ELO: {{ engineElo }}</span>
        </div>
        <div class="font-mono text-lg" role="timer" :aria-label="`AI time: ${formatTime(opponentTime)}`">{{ formatTime(opponentTime) }}</div>
      </div>

      <div class="board-area flex w-full gap-2" :style="{ maxWidth: (boardSize + 36) + 'px', height: boardSize + 'px' }">
        <GameEvaluationBar :evaluation="evaluation" :flipped="playerColor === 'black'" />
        <div class="flex-1 min-w-0 min-h-0">
          <ClientOnly>
            <TheChessboard
              :key="boardKey"
              :board-config="boardConfig"
              :reactive-config="true"
              @board-created="onBoardCreated"
              @move="onBoardMove"
              @checkmate="onCheckmate"
              @stalemate="onStalemate"
              @draw="onDraw"
            />
          </ClientOnly>
        </div>
      </div>

      <div class="flex w-full items-center justify-between" :style="{ maxWidth: boardSize + 'px' }">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-user" class="size-5 text-green-400" />
          <span class="font-semibold">You ({{ playerColor === 'white' ? 'White' : 'Black' }})</span>
        </div>
        <div class="font-mono text-lg" role="timer" :aria-label="`Your time: ${formatTime(myTime)}`">{{ formatTime(myTime) }}</div>
      </div>
    </div>

    <div class="flex h-full w-full flex-col gap-4 lg:w-80 lg:shrink-0">
      <!-- <GameMoveHistory :moves="moves" /> -->

      <div class="flex gap-2">
        <UButton label="New Game" icon="i-lucide-refresh-cw" variant="outline" class="flex-1" @click="resetGame" />
        <UButton label="Resign" icon="i-lucide-flag" variant="outline" color="error" class="flex-1" :disabled="gameOver" @click="onResign" />
      </div>

      <div v-if="gameOver" class="rounded-lg bg-gray-800 p-4 text-center" role="alert">
        <p class="text-lg font-bold">{{ gameOverText }}</p>
        <UButton label="Play Again" class="mt-3" @click="resetGame" />
      </div>

      <div v-if="isAiThinking" class="flex items-center gap-2 text-sm text-gray-400" role="status">
        <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
        <span>AI is thinking...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'game' })
import { TheChessboard } from 'vue3-chessboard'
import type BoardApi from 'vue3-chessboard/dist/src/classes/BoardApi'
import 'vue3-chessboard/style.css'
import type { Move } from 'chess.js'
import type { EngineBestmoveResponse, EngineEvaluation } from '~/../shared/types'
import { parseTimeControl } from '~/../shared/constants'

const DEFAULT_TC = parseTimeControl('10+0')

const route = useRoute()
const gameContainer = ref<HTMLElement | null>(null)
const { boardSize } = useBoardSize(gameContainer)

const engineElo = ref(Number(route.query.elo) || 1500)
const playerColor = ref<string>((route.query.color as string) || 'white')
const aiColor = computed(() => playerColor.value === 'white' ? 'black' : 'white')

const boardConfig = computed(() => ({
  orientation: playerColor.value,
}))

const moves = ref<string[]>([])
const gameOver = ref(false)
const gameOverReason = ref('')
const boardKey = ref(0)
const isAiThinking = ref(false)
const boardApi = ref<InstanceType<typeof BoardApi> | null>(null)
const evaluation = ref<{ type: 'cp' | 'mate'; value: number } | null>(null)

const fetchEvaluation = async () => {
  if (!boardApi.value || gameOver.value) return
  const history = boardApi.value.getHistory()
  if (history.length === 0) {
    evaluation.value = null
    return
  }
  try {
    const sanMovesStr = history.join(' ')
    const result = await $fetch<{ eval: { type: 'cp' | 'mate'; value: number } | null }>('/api/engine/eval', {
      method: 'POST',
      body: { sanMoves: sanMovesStr, movetime: 500 },
    })
    evaluation.value = result.eval ? { type: result.eval.type, value: result.eval.value } : null
  } catch {
    evaluation.value = null
  }
}

const { whiteTime, blackTime, formatTime, startTimer, stopTimer, resetClock } = useChessClock()
resetClock(DEFAULT_TC.base)

const myTime = computed(() => playerColor.value === 'white' ? whiteTime.value : blackTime.value)
const opponentTime = computed(() => playerColor.value === 'white' ? blackTime.value : whiteTime.value)

const gameOverText = computed(() => {
  if (gameOverReason.value === 'checkmate') return 'Checkmate!'
  if (gameOverReason.value === 'stalemate') return 'Stalemate!'
  if (gameOverReason.value === 'draw') return 'Draw!'
  if (gameOverReason.value === 'resign') return 'You resigned'
  return 'Game Over'
})

const onBoardCreated = (api: InstanceType<typeof BoardApi>) => {
  boardApi.value = api
  if (playerColor.value === 'black') {
    isAiThinking.value = true
    setTimeout(() => getAiMove(), 300)
  }
}

const onBoardMove = (move: Move) => {
  if (gameOver.value) return
  moves.value.push(move.san)
  startTimer(() => {
    const turn = boardApi.value?.getTurnColor()
    return turn === 'white' ? 'white' : 'black'
  })

  if (boardApi.value?.getIsGameOver()) return

  if (boardApi.value?.getTurnColor() !== aiColor.value) return

  isAiThinking.value = true
  fetchEvaluation()
  setTimeout(() => {
    getAiMove()
  }, 300)
}

const onCheckmate = () => {
  gameOver.value = true
  gameOverReason.value = 'checkmate'
  stopTimer()
}

const onStalemate = () => {
  gameOver.value = true
  gameOverReason.value = 'stalemate'
  stopTimer()
}

const onDraw = () => {
  gameOver.value = true
  gameOverReason.value = 'draw'
  stopTimer()
}

const onResign = () => {
  gameOver.value = true
  gameOverReason.value = 'resign'
  stopTimer()
}

const getAiMove = async () => {
  if (!boardApi.value || gameOver.value) {
    isAiThinking.value = false
    return
  }

  try {
    const history = boardApi.value.getHistory()
    const body: Record<string, unknown> = {
      elo: engineElo.value,
      movetime: 1000,
    }
    if (history.length > 0) {
      body.sanMoves = history.join(' ')
    }

    const result = await $fetch<EngineBestmoveResponse>('/api/engine/bestmove', {
      method: 'POST',
      body,
    })

    if (result.bestmove && boardApi.value && !gameOver.value) {
      const from = result.bestmove.substring(0, 2)
      const to = result.bestmove.substring(2, 4)
      const promotion = result.bestmove.length > 4 ? result.bestmove[4] : undefined

      const success = boardApi.value.move({
        from: from as `${string}${number}`,
        to: to as `${string}${number}`,
        promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
      })

      if (success) {
        const lastMove = boardApi.value.getLastMove()
        if (lastMove) {
          moves.value.push(lastMove.san)
        }

        if (boardApi.value.getIsCheckmate()) {
          gameOver.value = true
          gameOverReason.value = 'checkmate'
          stopTimer()
        } else if (boardApi.value.getIsStalemate()) {
          gameOver.value = true
          gameOverReason.value = 'stalemate'
          stopTimer()
        } else if (boardApi.value.getIsDraw()) {
          gameOver.value = true
          gameOverReason.value = 'draw'
          stopTimer()
        }
      }
    }
  } catch (e) {
    console.error('AI move failed:', e)
  } finally {
    isAiThinking.value = false
    fetchEvaluation()
  }
}

const resetGame = () => {
  moves.value = []
  gameOver.value = false
  gameOverReason.value = ''
  boardKey.value++
  resetClock(DEFAULT_TC.base)
  isAiThinking.value = false
  boardApi.value = null
  evaluation.value = null
}
</script>

<style scoped>
.board-area :deep(.main-wrap) {
  width: 100%;
  height: 100%;
  margin: 0;
}
.board-area :deep(.main-board) {
  position: relative;
  height: 100%;
  padding-bottom: 0;
  width: auto;
  aspect-ratio: 1;
}
.board-area :deep(.cg-wrap) {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
