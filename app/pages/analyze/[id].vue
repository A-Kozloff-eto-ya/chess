<template>
  <div class="flex h-full flex-col">
    <div v-if="status === 'loading' || status === 'analyzing'" class="flex flex-1 items-center justify-center">
      <div class="text-center">
        <UIcon name="i-lucide-brain" class="mx-auto mb-3 size-10 animate-pulse text-amber-400" />
        <p class="font-semibold">{{ $t('analyzingGame') }}</p>
        <p class="mt-1 text-sm text-gray-400">{{ $t('analysisMovetime') }}</p>
        <div class="mx-auto mt-4 h-2 w-48 overflow-hidden rounded-full bg-gray-700">
          <div class="h-full rounded-full bg-amber-500 transition-all duration-500" :style="{ width: progress + '%' }" />
        </div>
        <p class="mt-2 text-xs text-gray-500">{{ progress }}%</p>
      </div>
    </div>

    <div v-else-if="status === 'failed'" class="flex flex-1 items-center justify-center">
      <div class="text-center">
        <UIcon name="i-lucide-alert-triangle" class="mx-auto mb-3 size-10 text-red-400" />
        <p class="font-semibold">{{ $t('analysisFailed') }}</p>
        <UButton :label="$t('retry')" variant="outline" class="mt-4" @click="startAnalysis" />
      </div>
    </div>

    <div v-else-if="analysis" ref="gameContainer" class="flex flex-1 gap-4 lg:flex-row">
      <div class="flex flex-1 flex-col items-center gap-2 min-w-0 min-h-0">
        <div class="flex w-full items-center justify-between" :style="{ maxWidth: boardSize + 'px' }">
          <div class="flex items-center gap-2">
            <UAvatar :src="game?.blackPlayer?.avatar || undefined" size="sm" />
            <div>
              <p class="text-sm font-semibold">{{ game?.blackPlayer?.username }}</p>
              <p class="text-xs text-gray-400">
                {{ $t('accuracy') }}: <span :class="blackAccuracy >= 80 ? 'text-green-400' : blackAccuracy >= 50 ? 'text-yellow-400' : 'text-red-400'">{{ blackAccuracy }}%</span>
              </p>
            </div>
          </div>
          <div v-if="currentMoveIndex > 0" class="font-mono text-sm" :class="currentEval >= 0 ? 'text-white' : 'text-gray-300'">
            {{ formatEval(currentEval) }}
          </div>
        </div>

        <div class="board-area flex w-full gap-2" :style="{ maxWidth: (boardSize + 36) + 'px', height: boardSize + 'px' }">
          <GameEvaluationBar
            :evaluation="evalForBar"
          />
          <div class="flex-1 min-w-0 min-h-0">
            <ClientOnly>
              <TheChessboard :board-config="boardConfig" @board-created="onBoardCreated" />
            </ClientOnly>
          </div>
        </div>

        <div class="flex w-full items-center justify-between" :style="{ maxWidth: boardSize + 'px' }">
          <div class="flex items-center gap-2">
            <UAvatar :src="game?.whitePlayer?.avatar || undefined" size="sm" />
            <div>
              <p class="text-sm font-semibold">{{ game?.whitePlayer?.username }}</p>
              <p class="text-xs text-gray-400">
                {{ $t('accuracy') }}: <span :class="whiteAccuracy >= 80 ? 'text-green-400' : whiteAccuracy >= 50 ? 'text-yellow-400' : 'text-red-400'">{{ whiteAccuracy }}%</span>
              </p>
            </div>
          </div>
          <div class="text-sm text-gray-400">{{ $t('result') }}: {{ game?.result }}</div>
        </div>

        <AnalysisEvalGraph
          :evaluations="analysis.evaluations"
          :current-index="currentMoveIndex"
          :width="boardSize"
        />

        <div class="flex gap-2">
          <UButton icon="i-lucide-skip-back" variant="ghost" size="sm" aria-label="First move" @click="goFirst" />
          <UButton icon="i-lucide-chevron-left" variant="ghost" size="sm" aria-label="Previous move" @click="goPrev" />
          <UButton icon="i-lucide-chevron-right" variant="ghost" size="sm" aria-label="Next move" @click="goNext" />
          <UButton icon="i-lucide-skip-forward" variant="ghost" size="sm" aria-label="Last move" @click="goLast" />
        </div>
      </div>

      <div class="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
        <div v-if="currentAnalyzedMove" class="rounded-lg bg-gray-800 p-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">{{ currentAnalyzedMove.san }}</span>
            <span :class="qualityBadge(currentAnalyzedMove.quality)" class="rounded px-2 py-0.5 text-xs font-medium">
              {{ $t(currentAnalyzedMove.quality) }}
            </span>
          </div>
          <div v-if="currentAnalyzedMove.bestMove" class="mt-2 text-xs text-gray-400">
            {{ $t('bestMoveWas') }}: <span class="font-mono text-amber-400">{{ currentAnalyzedMove.bestMove }}</span>
          </div>
        </div>

        <AnalysisAnalyzedMoveList
          :analyzed-moves="analysis.analyzedMoves"
          :current-move-index="currentMoveIndex"
          @go-to-move="goToMove"
        />

        <div class="rounded-lg bg-gray-800 p-3">
          <p class="mb-2 text-sm font-medium text-gray-300">{{ $t('accuracyChart') }}</p>
          <div class="flex items-center gap-3">
            <div class="flex-1">
              <p class="text-xs text-gray-400">{{ game?.whitePlayer?.username }}</p>
              <div class="mt-1 h-2 overflow-hidden rounded-full bg-gray-700">
                <div class="h-full rounded-full bg-green-500" :style="{ width: whiteAccuracy + '%' }" />
              </div>
              <p class="mt-1 text-xs" :class="whiteAccuracy >= 80 ? 'text-green-400' : 'text-gray-400'">{{ whiteAccuracy }}%</p>
            </div>
            <div class="flex-1">
              <p class="text-xs text-gray-400">{{ game?.blackPlayer?.username }}</p>
              <div class="mt-1 h-2 overflow-hidden rounded-full bg-gray-700">
                <div class="h-full rounded-full bg-green-500" :style="{ width: blackAccuracy + '%' }" />
              </div>
              <p class="mt-1 text-xs" :class="blackAccuracy >= 80 ? 'text-green-400' : 'text-gray-400'">{{ blackAccuracy }}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'game' })
import { TheChessboard } from 'vue3-chessboard'
import 'vue3-chessboard/style.css'
import type { BoardApi } from 'vue3-chessboard'

const route = useRoute()
const gameId = route.params.id as string

interface GameDetail {
  id: number
  whitePlayer?: { id: number; username: string; rating: number; avatar: string | null }
  blackPlayer?: { id: number; username: string; rating: number; avatar: string | null }
  result: string | null
  moves: { from: string; to: string; san: string }[]
}

const game = ref<GameDetail | null>(null)
const boardApi = ref<InstanceType<typeof BoardApi> | null>(null)
const boardConfig = { viewOnly: true }

const gameContainer = ref<HTMLElement | null>(null)
const { boardSize } = useBoardSize(gameContainer, 160)

const {
  analysis, status, progress, currentMoveIndex, positions,
  currentEval, currentAnalyzedMove, whiteAccuracy, blackAccuracy,
  goToMove, goNext, goPrev, goFirst, goLast, startAnalysis,
} = useAnalysis(gameId)

const evalForBar = computed(() => {
  const ev = currentEval.value
  if (Math.abs(ev) >= 90000) {
    return { type: 'mate' as const, value: ev > 0 ? Math.round((100000 - ev) / 100) : Math.round((ev + 100000) / 100) }
  }
  return { type: 'cp' as const, value: ev }
})

const formatEval = (cp: number) => {
  if (Math.abs(cp) >= 90000) {
    return cp > 0 ? `+M${Math.round((100000 - cp) / 100)}` : `-M${Math.round((cp + 100000) / 100)}`
  }
  return (cp > 0 ? '+' : '') + (cp / 100).toFixed(1)
}

const qualityBadge = (quality: string) => {
  switch (quality) {
    case 'best': return 'bg-green-900 text-green-300'
    case 'good': return 'bg-blue-900 text-blue-300'
    case 'inaccuracy': return 'bg-yellow-900 text-yellow-300'
    case 'mistake': return 'bg-orange-900 text-orange-300'
    case 'blunder': return 'bg-red-900 text-red-300'
    default: return 'bg-gray-700 text-gray-300'
  }
}

const onBoardCreated = (api: InstanceType<typeof BoardApi>) => {
  boardApi.value = api
}

const showPosition = (index: number) => {
  if (!boardApi.value || !positions.value[index]) return
  boardApi.value.setPosition(positions.value[index])
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
