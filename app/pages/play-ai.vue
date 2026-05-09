<template>
  <div ref="gameContainer" class="flex h-full flex-col lg:h-full lg:flex-row lg:gap-4 lg:max-w-7xl lg:mx-auto">
    <div class="flex flex-1 flex-col items-center gap-1 min-w-0 min-h-0 lg:gap-2 lg:px-0">
      <div class="flex w-full items-center justify-between px-2 lg:px-0" :style="{ maxWidth: boardSize + 'px' }">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-bot" class="size-5 text-info" />
          <span class="text-sm font-semibold lg:text-base">{{ $t('stockfishAI') }}</span>
          <span class="text-xs text-muted lg:text-sm">{{ $t('elo', { elo: engineElo }) }}</span>
          <GameCapturedPieces :captured="opponentCaptured" :color="aiColor" :material-diff="captured.materialDiff" />
        </div>
        <div class="font-mono text-xl lg:text-lg" role="timer" :aria-label="`AI time: ${formatTime(opponentTime)}`">{{ formatTime(opponentTime) }}</div>
      </div>

      <div class="board-area w-full" :style="{ maxWidth: boardSize + 'px', height: boardSize + 'px' }">
          <ClientOnly>
            <ChessBoard
              :key="boardKey"
              :board-config="boardConfig"
              :player-color="playerColor"
              :reactive-config="true"
              :board-theme="settings.boardTheme"
              :piece-theme="settings.pieceTheme"
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
          <UAvatar :src="resolveAvatar(user?.avatar)" size="sm" />
          <span class="text-sm font-semibold lg:text-base">{{ user?.username || $t('youColor', { color: playerColor === 'white' ? $t('white') : $t('black') }) }}</span>
          <GameCapturedPieces :captured="playerCaptured" :color="playerColor" :material-diff="captured.materialDiff" />
        </div>
        <div class="font-mono text-xl lg:text-lg" role="timer" :aria-label="`Your time: ${formatTime(myTime)}`">{{ formatTime(myTime) }}</div>
      </div>
    </div>

    <div class="mt-2 flex flex-col gap-2 p-2 lg:mt-0 lg:w-80 lg:shrink-0 lg:gap-4 lg:overflow-y-auto lg:min-h-0">
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
import type { Key } from 'chessground/types'
import type { EngineBestmoveResponse } from '~/../shared/types'
import { parseTimeControl } from '~/../shared/constants'

const DEFAULT_TC = parseTimeControl('10+0')
const { t } = useI18n()
const { settings } = useSettings()
const sounds = useSounds()

const { user } = useUserSession()
const { resolveAvatar } = useAvatar()
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
const boardApi = ref<ReturnType<typeof useChessground> | null>(null)

const currentFen = ref('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
const captured = useCapturedPieces(currentFen)
const playerCaptured = computed(() => playerColor.value === 'white' ? captured.value.white : captured.value.black)
const opponentCaptured = computed(() => playerColor.value === 'white' ? captured.value.black : captured.value.white)

const updateFen = () => {
  if (boardApi.value) currentFen.value = boardApi.value.getFen()
}

const { whiteTime, blackTime, formatTime, startTimer, stopTimer, resetClock, applyIncrement } = useChessClock()
resetClock(DEFAULT_TC.base, DEFAULT_TC.increment)

const myTime = computed(() => playerColor.value === 'white' ? whiteTime.value : blackTime.value)
const opponentTime = computed(() => playerColor.value === 'white' ? blackTime.value : whiteTime.value)

const gameOverText = computed(() => {
  if (gameOverReason.value === 'checkmate') return t('checkmate')
  if (gameOverReason.value === 'stalemate') return t('stalemate')
  if (gameOverReason.value === 'draw') return t('drawGame')
  if (gameOverReason.value === 'resign') return t('youResigned')
  return t('gameOver')
})

const onBoardCreated = (api: ReturnType<typeof useChessground>) => {
  boardApi.value = api
  if (playerColor.value === 'black') {
    isAiThinking.value = true
    setTimeout(() => getAiMove(), 300)
  }
}

const onBoardMove = (move: { from: string; to: string; promotion?: string; san: string; captured?: string }) => {
  if (gameOver.value) return
  moves.value.push(move.san)

  if (move.captured) {
    sounds.capture()
  } else {
    sounds.move()
  }

  const movedColor: 'white' | 'black' = boardApi.value?.getTurnColor() === 'w' ? 'black' : 'white'
  applyIncrement(movedColor)

  nextTick(updateFen)

  startTimer(() => {
    const turn = boardApi.value?.getTurnColor()
    return turn === 'w' ? 'white' : 'black'
  })

  if (boardApi.value?.isGameOver()) return

  if (boardApi.value?.getTurnColor() !== (aiColor.value === 'white' ? 'w' : 'b')) return

  isAiThinking.value = true
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

      const success = boardApi.value.move(
        from as Key,
        to as Key,
        promotion as 'q' | 'r' | 'b' | 'n' | undefined,
      )

      if (success) {
        const lastMove = boardApi.value.getLastMove()
        if (lastMove) {
          moves.value.push(lastMove.san)
          if (lastMove.captured) {
            sounds.capture()
          } else {
            sounds.move()
          }
        }

        nextTick(updateFen)

        if (boardApi.value.isCheckmate()) {
          gameOver.value = true
          gameOverReason.value = 'checkmate'
          stopTimer()
        } else if (boardApi.value.isStalemate()) {
          gameOver.value = true
          gameOverReason.value = 'stalemate'
          stopTimer()
        } else if (boardApi.value.isDraw()) {
          gameOver.value = true
          gameOverReason.value = 'draw'
          stopTimer()
        } else {
          const pm = boardApi.value.tryPlayPremove()
          if (pm) {
            moves.value.push(pm.san)
            if (pm.captured) {
              sounds.capture()
            } else {
              sounds.move()
            }
            if (boardApi.value.isCheckmate()) {
              gameOver.value = true
              gameOverReason.value = 'checkmate'
              stopTimer()
            } else if (boardApi.value.isStalemate()) {
              gameOver.value = true
              gameOverReason.value = 'stalemate'
              stopTimer()
            } else if (boardApi.value.isDraw()) {
              gameOver.value = true
              gameOverReason.value = 'draw'
              stopTimer()
            } else {
              setTimeout(() => getAiMove(), 300)
              return
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('AI move failed:', e)
  }

  isAiThinking.value = false
}

const resetGame = () => {
  moves.value = []
  gameOver.value = false
  gameOverReason.value = ''
  boardKey.value++
  resetClock(DEFAULT_TC.base, DEFAULT_TC.increment)
  boardApi.value = null
  currentFen.value = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
}
</script>

<style scoped>
.board-area .chess-board-wrap {
  width: 100%;
  height: 100%;
}
</style>
