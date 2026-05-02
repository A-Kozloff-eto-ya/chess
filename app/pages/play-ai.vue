<template>
  <div ref="gameContainer" class="flex h-full flex-col lg:h-auto lg:flex-row lg:gap-4 lg:max-w-7xl lg:mx-auto">
    <div class="flex flex-1 flex-col items-center gap-1 min-w-0 min-h-0 lg:gap-2 lg:px-0">
      <div class="flex w-full items-center justify-between px-2 lg:px-0" :style="{ maxWidth: boardSize + 'px' }">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-bot" class="size-5 text-info" />
          <span class="text-sm font-semibold lg:text-base">{{ $t('stockfishAI') }}</span>
          <span class="text-xs text-muted lg:text-sm">{{ $t('elo', { elo: engineElo }) }}</span>
        </div>
        <div class="font-mono text-xl lg:text-lg" role="timer" :aria-label="`AI time: ${formatTime(opponentTime)}`">{{ formatTime(opponentTime) }}</div>
      </div>

      <div class="board-area w-full" :style="{ maxWidth: boardSize + 'px', height: boardSize + 'px' }">
          <ClientOnly>
            <TheChessboard
              :key="boardKey"
              :board-config="boardConfig"
              :reactive-config="true"
              @board-created="onBoardCreated"
              @move="onBoardMove"
              @check="onCheck"
              @checkmate="onCheckmate"
              @stalemate="onStalemate"
              @draw="onDraw"
            />
          </ClientOnly>
      </div>

      <div class="flex w-full items-center justify-between px-2 lg:px-0" :style="{ maxWidth: boardSize + 'px' }">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-user" class="size-5 text-success" />
          <span class="text-sm font-semibold lg:text-base">{{ $t('youColor', { color: playerColor === 'white' ? $t('white') : $t('black') }) }}</span>
        </div>
        <div class="font-mono text-xl lg:text-lg" role="timer" :aria-label="`Your time: ${formatTime(myTime)}`">{{ formatTime(myTime) }}</div>
      </div>
    </div>

    <div class="mt-2 flex flex-col gap-2 p-2 lg:mt-0 lg:w-80 lg:shrink-0 lg:gap-4">
      <div class="hidden lg:block">
        <GameMoveHistory :moves="moves" />
      </div>

      <div class="flex gap-2">
        <UButton :label="$t('newGame')" icon="i-lucide-refresh-cw" variant="outline" class="flex-1" @click="resetGame" />
        <UButton :label="$t('resign')" icon="i-lucide-flag" variant="outline" color="error" class="flex-1" :disabled="gameOver" @click="onResign" />
      </div>

      <div v-if="gameOver" class="rounded-lg bg-elevated p-4 text-center" role="alert">
        <p class="text-lg font-bold">{{ gameOverText }}</p>
        <UButton :label="$t('playAgain')" class="mt-3" @click="resetGame" />
      </div>

      <div v-if="isAiThinking" class="flex items-center gap-2 text-sm text-muted" role="status">
        <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
        <span>{{ $t('aiThinking') }}</span>
      </div>

      <div class="lg:hidden">
        <GameMoveHistory :moves="moves" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'game' })
import { TheChessboard } from 'vue3-chessboard'
import type { BoardApi } from 'vue3-chessboard'
import type { Key } from 'chessground/types'
import 'vue3-chessboard/style.css'
import type { Move } from 'chess.js'
import type { EngineBestmoveResponse, EngineEvaluation } from '~/../shared/types'
import { parseTimeControl } from '~/../shared/constants'

const DEFAULT_TC = parseTimeControl('10+0')
const { t } = useI18n()
const sounds = useSounds()

const route = useRoute()
const gameContainer = ref<HTMLElement | null>(null)
const { boardSize } = useBoardSize(gameContainer)

const engineElo = ref(Number(route.query.elo) || 1500)
const engineMovetime = ref(Number(route.query.movetime) || 1000)
const playerColor = ref<'white' | 'black'>(((route.query.color as string) || 'white') as 'white' | 'black')
const aiColor = computed(() => playerColor.value === 'white' ? 'black' : 'white')

const boardConfig = computed(() => ({
  orientation: playerColor.value,
}))

const moves = ref<string[]>([])
const gameOver = ref(false)
const gameOverReason = ref('')
const boardKey = ref(0)
const isAiThinking = ref(false)
const boardApi = ref<BoardApi | null>(null)
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
  if (gameOverReason.value === 'checkmate') return t('checkmate')
  if (gameOverReason.value === 'stalemate') return t('stalemate')
  if (gameOverReason.value === 'draw') return t('drawGame')
  if (gameOverReason.value === 'resign') return t('youResigned')
  return t('gameOver')
})

const onBoardCreated = (api: BoardApi) => {
  boardApi.value = api
  if (playerColor.value === 'black') {
    isAiThinking.value = true
    setTimeout(() => getAiMove(), 300)
  }
}

const onBoardMove = (move: Move) => {
  if (gameOver.value) return
  moves.value.push(move.san)

  if (move.captured) {
    sounds.capture()
  } else {
    sounds.move()
  }

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
  sounds.checkmate()
}

const onCheck = () => {
  sounds.check()
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
      movetime: engineMovetime.value,
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
        from: from as Key,
        to: to as Key,
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
