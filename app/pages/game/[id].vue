<template>
  <div v-if="game" class="flex flex-col gap-4 lg:flex-row">
    <div class="flex flex-1 flex-col items-center gap-2">
      <div class="flex w-full max-w-[560px] items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="relative">
            <UAvatar :src="game.whitePlayer?.avatar || undefined" size="xs" />
            <span v-if="game.whitePlayer && isOnline(game.whitePlayer.id)"
              class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-gray-900 bg-green-500" />
            <span v-else-if="game.whitePlayer && getStatus(game.whitePlayer.id)?.online === false"
              class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-gray-900 bg-gray-500" />
          </div>
          <span class="text-sm">{{ game.whitePlayer?.username }}</span>
          <span class="text-xs text-gray-400">({{ game.whitePlayer?.rating }})</span>
        </div>
        <span class="font-mono text-amber-400">{{ game.result || '*' }}</span>
        <div class="flex items-center gap-2">
          <span class="text-sm">{{ game.blackPlayer?.username }}</span>
          <div class="relative">
            <UAvatar :src="game.blackPlayer?.avatar || undefined" size="xs" />
            <span v-if="game.blackPlayer && isOnline(game.blackPlayer.id)"
              class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-gray-900 bg-green-500" />
            <span v-else-if="game.blackPlayer && getStatus(game.blackPlayer.id)?.online === false"
              class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-gray-900 bg-gray-500" />
          </div>
        </div>
      </div>

      <div class="w-full">
        <ClientOnly>
          <TheChessboard :board-config="boardConfig" @board-created="onBoardCreated" />
        </ClientOnly>
      </div>

      <div class="flex gap-2">
        <UButton :label="$t('analyzeGame')" icon="i-lucide-microscope" variant="outline" size="sm" @click="navigateTo(`/analyze/${gameId}`)" />
        <UButton :label="$t('copyPGN')" icon="i-lucide-copy" variant="outline" size="sm" @click="copyPGN" />
        <UButton :label="$t('downloadPGN')" icon="i-lucide-download" variant="outline" size="sm" @click="downloadPGN" />
        <UButton :label="$t('copyFEN')" icon="i-lucide-square-code" variant="outline" size="sm" @click="copyFEN" />
      </div>
      <div class="flex gap-2">
        <UButton :label="$t('first')" icon="i-lucide-skip-back" variant="ghost" size="sm" aria-label="First move"
          @click="goToMove(0)" />
        <UButton :label="$t('prev')" icon="i-lucide-chevron-left" variant="ghost" size="sm" aria-label="Previous move"
          @click="goToMove(currentMoveIndex - 1)" />
        <UButton :label="$t('next')" icon="i-lucide-chevron-right" variant="ghost" size="sm" aria-label="Next move"
          @click="goToMove(currentMoveIndex + 1)" />
        <UButton :label="$t('last')" icon="i-lucide-skip-forward" variant="ghost" size="sm" aria-label="Last move"
          @click="goToMove(moves.length)" />
      </div>
    </div>

    <div class="flex w-full flex-col gap-4 lg:w-80">
      <GameMoveHistory :moves="moves" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chess } from 'chess.js'
import { TheChessboard } from 'vue3-chessboard'
import 'vue3-chessboard/style.css'
import type { BoardApi } from 'vue3-chessboard'

const route = useRoute()
const gameId = route.params.id as string
const { isOnline, getStatus, fetchOnlineStatus } = useOnlineUsers()
const { t } = useI18n()
const toast = useToast()

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
const boardApi = ref<InstanceType<typeof BoardApi> | null>(null)

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

const onBoardCreated = (api: InstanceType<typeof BoardApi>) => {
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