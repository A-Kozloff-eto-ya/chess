<template>
  <div class="flex h-full flex-col lg:h-full">
    <div v-if="status === 'loading' || status === 'analyzing'" class="flex flex-1 items-center justify-center">
      <div class="text-center p-4">
        <UIcon name="i-lucide-brain" class="mx-auto mb-3 size-10 animate-pulse text-primary" />
        <p class="font-semibold">{{ $t('analyzingGame') }}</p>
        <p class="mt-1 text-sm text-muted">{{ $t('analysisMovetime') }}</p>
        <div class="mx-auto mt-4 h-2 w-48 overflow-hidden rounded-full bg-accented">
          <div class="h-full rounded-full bg-primary transition-all duration-500" :style="{ width: progress + '%' }" />
        </div>
        <p class="mt-2 text-xs text-muted">{{ progress }}%</p>
      </div>
    </div>

    <div v-else-if="status === 'failed'" class="flex flex-1 items-center justify-center">
      <div class="text-center p-4">
        <UIcon name="i-lucide-alert-triangle" class="mx-auto mb-3 size-10 text-error" />
        <p class="font-semibold">{{ $t('analysisFailed') }}</p>
        <UButton :label="$t('retry')" variant="outline" class="mt-4" @click="startAnalysis" />
      </div>
    </div>

    <div v-else-if="analysis" ref="gameContainer" class="flex h-full flex-col gap-2 lg:flex-row lg:gap-4 lg:max-w-7xl lg:mx-auto">
      <div class="flex flex-1 flex-col items-center gap-1 min-w-0 min-h-0 lg:gap-2">
        <div class="flex w-full items-center justify-between" :style="{ maxWidth: boardSize + 'px' }">
          <div class="flex items-center gap-2 min-w-0">
            <UAvatar :src="resolveAvatar(game?.blackPlayer?.avatar)" size="sm" />
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ game?.blackPlayer?.username }}</p>
              <p class="text-xs text-muted">
                {{ $t('accuracy') }}: <span :class="blackAccuracy >= 80 ? 'text-success' : blackAccuracy >= 50 ? 'text-warning' : 'text-error'">{{ blackAccuracy }}%</span>
              </p>
            </div>
            <GameCapturedPieces :captured="captured.black" color="black" :material-diff="captured.materialDiff" />
          </div>
          <div v-if="currentMoveIndex > 0" class="shrink-0 font-mono text-sm" :class="currentEval >= 0 ? 'text-inverted' : 'text-default'">
            {{ formatEval(currentEval) }}
          </div>
        </div>

        <div class="board-area flex w-full gap-2" :style="{ maxWidth: (boardSize + 36) + 'px', height: boardSize + 'px' }">
          <GameEvaluationBar :evaluation="evalForBar" :compact="boardSize < 360" />
          <div class="flex-1 min-w-0 min-h-0">
            <ClientOnly>
              <ChessBoard :board-config="boardConfig" :board-theme="settings.boardTheme" :piece-theme="settings.pieceTheme" @board-created="onBoardCreated" />
            </ClientOnly>
          </div>
        </div>

        <div class="flex w-full items-center justify-between" :style="{ maxWidth: boardSize + 'px' }">
          <div class="flex items-center gap-2 min-w-0">
            <UAvatar :src="resolveAvatar(game?.whitePlayer?.avatar)" size="sm" />
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ game?.whitePlayer?.username }}</p>
              <p class="text-xs text-muted">
                {{ $t('accuracy') }}: <span :class="whiteAccuracy >= 80 ? 'text-success' : whiteAccuracy >= 50 ? 'text-warning' : 'text-error'">{{ whiteAccuracy }}%</span>
              </p>
            </div>
            <GameCapturedPieces :captured="captured.white" color="white" :material-diff="captured.materialDiff" />
          </div>
          <div class="shrink-0 text-xs text-muted">{{ $t('result') }}: {{ game?.result }}</div>
        </div>

        <AnalysisEvalGraph
          :evaluations="analysis.evaluations"
          :current-index="currentMoveIndex"
          :width="boardSize"
          class="hidden lg:block"
        />

        <div class="flex gap-1.5">
          <UButton icon="i-lucide-skip-back" variant="ghost" size="sm" aria-label="First move" class="flex-1" @click="goFirst" />
          <UButton icon="i-lucide-chevron-left" variant="ghost" size="sm" aria-label="Previous move" class="flex-1" @click="goPrev" />
          <UButton icon="i-lucide-chevron-right" variant="ghost" size="sm" aria-label="Next move" class="flex-1" @click="goNext" />
          <UButton icon="i-lucide-skip-forward" variant="ghost" size="sm" aria-label="Last move" class="flex-1" @click="goLast" />
        </div>
      </div>

      <div class="flex w-full flex-col gap-3 lg:w-80 lg:shrink-0 lg:gap-4 lg:min-h-0 lg:overflow-y-auto">
        <div v-if="currentAnalyzedMove" class="rounded-lg bg-elevated p-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">{{ currentAnalyzedMove.san }}</span>
            <span :class="qualityBadge(currentAnalyzedMove.quality)" class="rounded px-2 py-0.5 text-xs font-medium">
              {{ $t(currentAnalyzedMove.quality) }}
            </span>
          </div>
          <div v-if="currentAnalyzedMove.bestMove" class="mt-2 text-xs text-muted">
            {{ $t('bestMoveWas') }}: <span class="font-mono text-primary">{{ currentAnalyzedMove.bestMove }}</span>
          </div>
        </div>

        <AnalysisAnalyzedMoveList
          :analyzed-moves="analysis.analyzedMoves"
          :current-move-index="currentMoveIndex"
          @go-to-move="goToMove"
        />

        <div class="rounded-lg bg-elevated p-3">
          <p class="mb-2 text-sm font-medium text-default">{{ $t('accuracyChart') }}</p>
          <div class="flex items-center gap-3">
            <div class="flex-1">
              <p class="text-xs text-muted">{{ game?.whitePlayer?.username }}</p>
              <div class="mt-1 h-2 overflow-hidden rounded-full bg-accented">
                <div class="h-full rounded-full bg-success" :style="{ width: whiteAccuracy + '%' }" />
              </div>
              <p class="mt-1 text-xs" :class="whiteAccuracy >= 80 ? 'text-success' : 'text-muted'">{{ whiteAccuracy }}%</p>
            </div>
            <div class="flex-1">
              <p class="text-xs text-muted">{{ game?.blackPlayer?.username }}</p>
              <div class="mt-1 h-2 overflow-hidden rounded-full bg-accented">
                <div class="h-full rounded-full bg-success" :style="{ width: blackAccuracy + '%' }" />
              </div>
              <p class="mt-1 text-xs" :class="blackAccuracy >= 80 ? 'text-success' : 'text-muted'">{{ blackAccuracy }}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chess } from 'chess.js'
import type { DrawShape } from 'chessground/draw'
import type { GameDetail } from '~/types'
import { createMoveBadge } from '~/composables/useMoveBadge'
import { pieceIcon, qualityBadge, formatEval, parseSanMove, getAttackedSquares } from '~/utils/chess-ui'

definePageMeta({ layout: 'game' })

const route = useRoute()
const gameId = route.params.id as string
const { settings } = useSettings()

const game = ref<GameDetail | null>(null)
const boardApi = ref<ReturnType<typeof useChessground> | null>(null)
const boardConfig = { viewOnly: true }

const gameContainer = ref<HTMLElement | null>(null)
const { boardSize } = useBoardSize(gameContainer, 120, 36)
const { resolveAvatar } = useAvatar()

const {
  analysis, status, progress, currentMoveIndex, positions,
  currentEval, currentAnalyzedMove, whiteAccuracy, blackAccuracy,
  goToMove, goNext, goPrev, goFirst, goLast, startAnalysis,
} = useAnalysis(gameId)

const currentFen = computed(() => positions.value[currentMoveIndex.value] ?? '')
const captured = useCapturedPieces(currentFen)

const evalForBar = computed(() => {
  const ev = currentEval.value
  if (Math.abs(ev) >= 90000) {
    return { type: 'mate' as const, value: ev > 0 ? Math.round((100000 - ev) / 100) : Math.round((ev + 100000) / 100) }
  }
  return { type: 'cp' as const, value: ev }
})

const onBoardCreated = (api: ReturnType<typeof useChessground>) => {
  boardApi.value = api
}

const showPosition = (index: number) => {
  if (!boardApi.value || !positions.value[index]) return
  const fen = positions.value[index]
  const shapes: DrawShape[] = []

  const lastIdx = index - 1
  if (lastIdx >= 0 && lastIdx < analysis.value.analyzedMoves.length) {
    const lastMove = analysis.value.analyzedMoves[lastIdx]!
    shapes.push({ orig: lastMove.from as any, dest: lastMove.to as any, brush: 'green' })

    const badge = createMoveBadge(lastMove.to, lastMove.quality)
    if (badge) shapes.push(badge)

    const prevFen = positions.value[lastIdx]!
    if (lastMove.bestMove && lastMove.bestMove !== lastMove.san) {
      const bm = parseSanMove(prevFen, lastMove.bestMove)
      if (bm) shapes.push({ orig: bm.from as any, dest: bm.to as any, brush: 'blue' })
    }
  }

  for (const sq of getAttackedSquares(fen)) {
    shapes.push({ orig: sq as any, brush: 'yellow' })
  }

  const lastMove = lastIdx >= 0 && lastIdx < analysis.value.analyzedMoves.length
    ? analysis.value.analyzedMoves[lastIdx]!
    : undefined

  boardApi.value.setPosition(fen, lastMove ? { from: lastMove.from, to: lastMove.to } : undefined, shapes.length > 0 ? shapes : undefined)
}

watch(currentMoveIndex, (idx) => {
  showPosition(idx)
})

watch(() => positions.value.length, (len) => {
  if (len > 1 && boardApi.value) {
    showPosition(currentMoveIndex.value)
  }
})

onMounted(async () => {
  try {
    game.value = await $fetch<GameDetail>(`/api/games/${gameId}`)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Game not found' })
  }
})
</script>

<style scoped>
.board-area .chess-board-wrap {
  width: 100%;
  height: 100%;
}
</style>
