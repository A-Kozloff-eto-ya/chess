<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold">{{ $t('importPGN') }}</h1>
      <p class="mt-1 text-sm text-muted">{{ $t('importPgnDesc') }}</p>
    </div>

    <UCard>
      <div class="flex flex-col gap-4">
        <UTabs :items="tabItems" class="w-full">
          <template #pgn>
            <div class="flex flex-col gap-4 pt-4">
              <div
                class="rounded-lg border-2 border-dashed p-6 text-center transition-colors"
                :class="isDragOver ? 'border-primary bg-primary/10' : 'border-default hover:border-accented'"
                @dragover.prevent="isDragOver = true"
                @dragleave.prevent="isDragOver = false"
                @drop.prevent="onDrop"
              >
                <p class="text-sm text-muted">{{ $t('dragDropPgn') }}</p>
              </div>

              <UTextarea
                v-model="pgnText"
                :rows="8"
                :placeholder="$t('pastePgnHere')"
                class="font-mono text-sm"
              />

              <div class="flex items-center gap-4">
                <UButton :label="$t('loadPgn')" icon="i-lucide-upload" :disabled="!pgnText.trim() || analysisStatus === 'analyzing'" @click="loadPgn" />
                <label class="cursor-pointer">
                  <UButton :label="$t('uploadFile')" icon="i-lucide-file-up" variant="outline" :disabled="analysisStatus === 'analyzing'" />
                  <input type="file" accept=".pgn,.txt" class="hidden" @change="onFileUpload">
                </label>
                <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
              </div>
            </div>
          </template>

          <template #fen>
            <div class="flex flex-col gap-4 pt-4">
              <UTextarea
                v-model="fenText"
                :rows="3"
                :placeholder="$t('pasteFenHere')"
                class="font-mono text-sm"
              />

              <div class="flex items-center gap-4">
                <UButton :label="$t('loadFen')" icon="i-lucide-upload" :disabled="!fenText.trim()" @click="loadFen" />
                <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
              </div>
            </div>
          </template>
        </UTabs>
      </div>
    </UCard>

    <div v-if="analysisStatus === 'analyzing'" class="flex flex-col items-center gap-3 rounded-lg bg-elevated p-6">
      <UIcon name="i-lucide-brain" class="size-8 animate-pulse text-primary" />
      <p class="font-semibold">{{ $t('analyzingGame') }}</p>
      <div class="h-2 w-48 overflow-hidden rounded-full bg-accented">
        <div class="h-full rounded-full bg-primary transition-all duration-500" :style="{ width: progress + '%' }" />
      </div>
      <p class="text-xs text-muted">{{ progress }}%</p>
    </div>

    <div v-else-if="analysisStatus === 'failed'" class="flex flex-col items-center gap-3 rounded-lg bg-elevated p-6">
      <UIcon name="i-lucide-alert-triangle" class="size-8 text-error" />
      <p class="font-semibold">{{ $t('analysisFailed') }}</p>
      <UButton :label="$t('retry')" variant="outline" @click="retryAnalysis" />
    </div>

    <div v-else-if="showBoard" ref="gameContainer" class="flex flex-col gap-4 lg:flex-row">
      <div class="flex flex-1 flex-col items-center gap-2 min-w-0 min-h-0">
        <div class="flex w-full items-center justify-between" :style="{ maxWidth: boardSize + 'px' }">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">{{ loadedGame?.headers?.Black || $t('black') }}</span>
            <GameCapturedPieces :captured="captured.black" color="black" :material-diff="captured.materialDiff" />
          </div>
          <div v-if="analysis && currentMoveIndex > 0" class="font-mono text-sm" :class="currentEval >= 0 ? 'text-inverted' : 'text-default'">
            {{ formatEval(currentEval) }}
          </div>
          <div v-else-if="!analysis && currentMoveIndex > 0" class="text-sm text-muted">
            {{ loadedGame?.result || '*' }}
          </div>
        </div>

        <div class="board-area flex w-full gap-2" :style="{ maxWidth: (boardSize + 36) + 'px', height: boardSize + 'px' }">
          <GameEvaluationBar
            v-if="analysis"
            :evaluation="evalForBar"
          />
          <div class="flex-1 min-w-0 min-h-0">
            <ClientOnly>
              <ChessBoard :board-config="boardConfig" :board-theme="settings.boardTheme" :piece-theme="settings.pieceTheme" @board-created="onBoardCreated" />
            </ClientOnly>
          </div>
        </div>

        <div class="flex w-full items-center justify-between" :style="{ maxWidth: boardSize + 'px' }">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">{{ loadedGame?.headers?.White || $t('white') }}</span>
            <GameCapturedPieces :captured="captured.white" color="white" :material-diff="captured.materialDiff" />
          </div>
          <div class="text-sm text-muted">{{ loadedGame?.result || '*' }}</div>
        </div>

        <AnalysisEvalGraph
          v-if="analysis"
          :evaluations="analysis.evaluations"
          :current-index="currentMoveIndex"
          :width="boardSize"
        />

        <div class="flex gap-2">
          <UButton icon="i-lucide-skip-back" variant="ghost" size="sm" aria-label="First move" @click="goFirst" />
          <UButton icon="i-lucide-chevron-left" variant="ghost" size="sm" aria-label="Previous move" @click="goPrev" />
          <UButton icon="i-lucide-chevron-right" variant="ghost" size="sm" aria-label="Next move" @click="goNext" />
          <UButton icon="i-lucide-skip-forward" variant="ghost" size="sm" aria-label="Last move" @click="goLast" />
          <UButton v-if="!analysis && analysisStatus === 'idle' && loadedGame" :label="$t('analyze')" icon="i-lucide-brain" variant="outline" size="sm" @click="triggerAnalysis" />
        </div>
      </div>

      <div class="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
        <div v-if="analysis && currentAnalyzedMove" class="rounded-lg bg-elevated p-3">
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
          v-if="analysis"
          :analyzed-moves="analysis.analyzedMoves"
          :current-move-index="currentMoveIndex"
          @go-to-move="goToMove"
        />

        <GameMoveHistory
          v-else
          :moves="sanMoves"
        />

        <div v-if="analysis" class="rounded-lg bg-elevated p-3">
          <p class="mb-2 text-sm font-medium text-default">{{ $t('accuracyChart') }}</p>
          <div class="flex items-center gap-3">
            <div class="flex-1">
              <p class="text-xs text-muted">{{ loadedGame?.headers?.White || $t('white') }}</p>
              <div class="mt-1 h-2 overflow-hidden rounded-full bg-accented">
                <div class="h-full rounded-full bg-success" :style="{ width: whiteAccuracy + '%' }" />
              </div>
              <p class="mt-1 text-xs" :class="whiteAccuracy >= 80 ? 'text-success' : 'text-muted'">{{ whiteAccuracy }}%</p>
            </div>
            <div class="flex-1">
              <p class="text-xs text-muted">{{ loadedGame?.headers?.Black || $t('black') }}</p>
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
import { createMoveBadge } from '~/composables/useMoveBadge'
import { pieceIcon, qualityBadge, formatEval, parseSanMove, getAttackedSquares } from '~/utils/chess-ui'

const { parsePgn } = usePgn()
const { t } = useI18n()
const { settings } = useSettings()
const { analysisStatus, progress, analysis, startEngineAnalysis, resetAnalysis } = useEngineAnalysis()

const pgnText = ref('')
const fenText = ref('')
const errorMessage = ref('')
const isDragOver = ref(false)
const tabItems = [
  { label: 'PGN', slot: 'pgn' },
  { label: 'FEN', slot: 'fen' },
]
const loadedGame = ref<{ moves: { from: string; to: string; promotion?: string; san: string }[]; headers: Record<string, string>; result: string | null } | null>(null)
const boardApi = ref<ReturnType<typeof useChessground> | null>(null)
const boardConfig = { viewOnly: true, coordinates: true }

const positions = ref<string[]>([])
const sanMoves = ref<string[]>([])
const movesList = ref<{ from: string; to: string; promotion?: string; san: string }[]>([])
const currentMoveIndex = ref(0)

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

const showBoard = computed(() => loadedGame.value && analysisStatus.value !== 'analyzing')

const evalForBar = computed(() => {
  const ev = currentEval.value
  if (Math.abs(ev) >= 90000) {
    return { type: 'mate' as const, value: ev > 0 ? Math.round((100000 - ev) / 100) : Math.round((ev + 100000) / 100) }
  }
  return { type: 'cp' as const, value: ev }
})

const gameContainer = ref<HTMLElement | null>(null)
const { boardSize } = useBoardSize(gameContainer, 160, 36)

const currentFen = computed(() => positions.value[currentMoveIndex.value] ?? '')
const captured = useCapturedPieces(currentFen)

const buildPositions = (moves: { from: string; to: string; promotion?: string; san: string }[]) => {
  const chess = new Chess()
  positions.value = [chess.fen()]
  sanMoves.value = []
  movesList.value = [...moves]
  for (const m of moves) {
    try {
      chess.move({ from: m.from, to: m.to, promotion: m.promotion })
      positions.value.push(chess.fen())
      sanMoves.value.push(m.san)
    } catch {
      break
    }
  }
  currentMoveIndex.value = positions.value.length - 1
}

const showPosition = (index: number) => {
  if (!boardApi.value || !positions.value[index]) return
  const fen = positions.value[index]!
  const shapes: DrawShape[] = []

  if (index > 0 && index - 1 < movesList.value.length) {
    const prev = movesList.value[index - 1]!
    shapes.push({ orig: prev.from as any, dest: prev.to as any, brush: 'green' })

    if (analysis.value && index - 1 < analysis.value.analyzedMoves.length) {
      const am = analysis.value.analyzedMoves[index - 1]!
      const badge = createMoveBadge(prev.to, am.quality)
      if (badge) shapes.push(badge)
      if (am.bestMove && am.bestMove !== am.san) {
        const prevFen = positions.value[index - 1]!
        const bm = parseSanMove(prevFen, am.bestMove)
        if (bm) shapes.push({ orig: bm.from as any, dest: bm.to as any, brush: 'blue' })
      }
    }
  }

  for (const sq of getAttackedSquares(fen)) {
    shapes.push({ orig: sq as any, brush: 'yellow' })
  }

  const lastMove = index > 0 && index - 1 < movesList.value.length
    ? movesList.value[index - 1]!
    : undefined

  boardApi.value.setPosition(fen, lastMove ? { from: lastMove.from, to: lastMove.to } : undefined, shapes.length > 0 ? shapes : undefined)
}

const onBoardCreated = (api: ReturnType<typeof useChessground>) => {
  boardApi.value = api
  if (loadedGame.value) {
    showPosition(currentMoveIndex.value)
  }
}

const goToMove = (index: number) => {
  currentMoveIndex.value = Math.max(0, Math.min(index, positions.value.length - 1))
}
const goNext = () => goToMove(currentMoveIndex.value + 1)
const goPrev = () => goToMove(currentMoveIndex.value - 1)
const goFirst = () => goToMove(0)
const goLast = () => goToMove(positions.value.length - 1)

const loadPgn = () => {
  errorMessage.value = ''
  resetAnalysis()

  const result = parsePgn(pgnText.value)
  if (!result) {
    errorMessage.value = t('invalidPgn')
    loadedGame.value = null
    return
  }
  loadedGame.value = result
  buildPositions(result.moves)
  if (boardApi.value) {
    showPosition(currentMoveIndex.value)
  }
}

const loadFen = () => {
  errorMessage.value = ''
  resetAnalysis()

  try {
    const chess = new Chess()
    chess.load(fenText.value.trim())

    loadedGame.value = {
      moves: [],
      headers: { White: 'White', Black: 'Black', Result: '*' },
      result: null,
    }
    positions.value = [chess.fen()]
    sanMoves.value = []
    movesList.value = []
    currentMoveIndex.value = 0

    if (boardApi.value) {
      showPosition(0)
    }
  } catch {
    errorMessage.value = t('invalidFen')
    loadedGame.value = null
  }
}

const triggerAnalysis = () => {
  if (!loadedGame.value?.moves?.length) return
  startEngineAnalysis(loadedGame.value.moves)
}

const retryAnalysis = () => {
  triggerAnalysis()
}

const onDrop = (event: DragEvent) => {
  isDragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  readFile(file)
}

const readFile = (file: File) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    pgnText.value = e.target?.result as string || ''
    loadPgn()
  }
  reader.readAsText(file)
}

const onFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  readFile(file)
}

watch(currentMoveIndex, () => {
  showPosition(currentMoveIndex.value)
})

useBoardNavigation({ goNext, goPrev, goFirst, goLast })
</script>

<style scoped>
.board-area .chess-board-wrap {
  width: 100%;
  height: 100%;
}
</style>
