<template>
  <div v-if="game" ref="gameContainer" class="flex flex-col gap-3 lg:flex-row lg:gap-4">
    <div class="flex flex-1 flex-col items-center gap-2">
      <div class="flex w-full items-center justify-between" :style="{ maxWidth: (boardSize + 36) + 'px' }">
        <div class="flex items-center gap-2 min-w-0">
          <div class="relative">
            <UAvatar :src="resolveAvatar(game.whitePlayer?.avatar)" size="xs" />
            <span v-if="game.whitePlayer && isOnline(game.whitePlayer.id)"
              class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-default bg-success" />
          </div>
          <span class="truncate text-sm">{{ game.whitePlayer?.username }}</span>
          <span class="hidden text-xs text-muted sm:inline">({{ game.whitePlayer?.rating }})</span>
        </div>
        <span class="shrink-0 font-mono text-sm text-primary px-2">{{ game.result || '*' }}</span>
        <div class="flex items-center gap-2 min-w-0">
          <span class="truncate text-sm text-right">{{ game.blackPlayer?.username }}</span>
          <div class="relative shrink-0">
            <UAvatar :src="resolveAvatar(game.blackPlayer?.avatar)" size="xs" />
            <span v-if="game.blackPlayer && isOnline(game.blackPlayer.id)"
              class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-default bg-success" />
          </div>
        </div>
      </div>

        <div class="board-area w-full" :style="{ maxWidth: (boardSize + 36) + 'px', height: boardSize + 'px' }">
        <ClientOnly>
          <ChessBoard :board-config="boardConfig" @board-created="onBoardCreated" />
        </ClientOnly>
      </div>

      <div class="flex flex-wrap gap-1.5" :style="{ maxWidth: (boardSize + 36) + 'px' }">
        <UButton icon="i-lucide-microscope" variant="outline" size="sm" class="flex-1 min-w-0" @click="navigateTo(`/analyze/${gameId}`)">
          <span class="truncate">{{ $t('analyzeGame') }}</span>
        </UButton>
        <UButton icon="i-lucide-copy" variant="outline" size="sm" class="flex-1 min-w-0" @click="copyPGN">
          <span class="truncate">{{ $t('copyPGN') }}</span>
        </UButton>
        <UButton icon="i-lucide-download" variant="outline" size="sm" class="flex-1 min-w-0" @click="downloadPGN">
          <span class="truncate">{{ $t('downloadPGN') }}</span>
        </UButton>
        <UButton icon="i-lucide-square-code" variant="outline" size="sm" class="flex-1 min-w-0" @click="copyFEN">
          <span class="truncate">{{ $t('copyFEN') }}</span>
        </UButton>
      </div>

      <div class="flex gap-1.5" :style="{ maxWidth: (boardSize + 36) + 'px' }">
        <UButton icon="i-lucide-skip-back" variant="ghost" size="sm" aria-label="First move" class="flex-1" @click="goToMove(0)" />
        <UButton icon="i-lucide-chevron-left" variant="ghost" size="sm" aria-label="Previous move" class="flex-1" @click="goToMove(currentMoveIndex - 1)" />
        <UButton icon="i-lucide-chevron-right" variant="ghost" size="sm" aria-label="Next move" class="flex-1" @click="goToMove(currentMoveIndex + 1)" />
        <UButton icon="i-lucide-skip-forward" variant="ghost" size="sm" aria-label="Last move" class="flex-1" @click="goToMove(moves.length)" />
      </div>
    </div>

    <div class="flex w-full flex-col gap-4 lg:w-80">
      <GameMoveHistory :moves="moves" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chess } from 'chess.js'
import type { Config } from 'chessground/config'

const route = useRoute()
const gameId = route.params.id as string
const { isOnline, getStatus, fetchOnlineStatus } = useOnlineUsers()
const { resolveAvatar } = useAvatar()
const { t } = useI18n()
const toast = useToast()

const gameContainer = ref<HTMLElement | null>(null)
const { boardSize } = useBoardSize(gameContainer)

interface GameMove {
  from: string
  to: string
  promotion?: string
  san: string
}

interface GameDetail {
  id: number
  pgn: string | null
  moves: GameMove[]
  result: string | null
  whitePlayer?: { id: number; username: string; rating: number; avatar: string | null }
  blackPlayer?: { id: number; username: string; rating: number; avatar: string | null }
}

const game = ref<GameDetail | null>(null)
const moves = ref<string[]>([])
const positions = ref<string[]>([])
const currentMoveIndex = ref(0)
const boardApi = ref<ReturnType<typeof useChessground> | null>(null)

const boardConfig = {
  viewOnly: true,
}

const buildPositions = (gameMoves: GameMove[]) => {
  const chess = new Chess()
  positions.value = [chess.fen()]
  for (const m of gameMoves) {
    try {
      chess.move({ from: m.from, to: m.to, promotion: m.promotion })
      positions.value.push(chess.fen())
    } catch (e) {
      console.error('[GameViewer] Invalid move:', m, e)
      break
    }
  }
  moves.value = gameMoves.map(m => m.san)
  currentMoveIndex.value = positions.value.length - 1
}

const showPosition = (index: number) => {
  if (!boardApi.value || !positions.value[index]) return
  boardApi.value.setPosition(positions.value[index])
}

const onBoardCreated = (api: ReturnType<typeof useChessground>) => {
  boardApi.value = api
  if (game.value?.moves?.length) {
    loadGameIntoBoard()
  }
}

const loadGameIntoBoard = () => {
  if (!boardApi.value || !game.value?.moves?.length) return
  buildPositions(game.value.moves)
  showPosition(currentMoveIndex.value)
}

const fetchGame = async () => {
  try {
    game.value = await $fetch<GameDetail>(`/api/games/${gameId}`)
    if (game.value?.moves?.length) {
      buildPositions(game.value.moves)
      if (boardApi.value) {
        showPosition(currentMoveIndex.value)
      }
    }
    const ids = [game.value?.whitePlayer?.id, game.value?.blackPlayer?.id].filter((id): id is number => id != null)
    if (ids.length) await fetchOnlineStatus(ids)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  }
}

const goToMove = (index: number) => {
  const clamped = Math.max(0, Math.min(index, positions.value.length - 1))
  currentMoveIndex.value = clamped
  showPosition(clamped)
}

const copyPGN = async () => {
  if (!game.value?.pgn) return
  await navigator.clipboard.writeText(game.value.pgn)
  toast.add({ title: t('pgnCopied'), color: 'success' })
}

const downloadPGN = () => {
  if (!game.value?.pgn) return
  const blob = new Blob([game.value.pgn], { type: 'application/x-chess-pgn' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `game-${gameId}.pgn`
  a.click()
  URL.revokeObjectURL(url)
}

const copyFEN = async () => {
  const fen = positions.value[currentMoveIndex.value]
  if (!fen) return
  await navigator.clipboard.writeText(fen)
  toast.add({ title: t('fenCopied'), color: 'success' })
}

onMounted(fetchGame)
</script>

<style scoped>
.board-area .chess-board-wrap {
  width: 100%;
  height: 100%;
}
</style>
