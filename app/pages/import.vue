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
              <ChessBoard :board-config="boardConfig" @board-created="onBoardCreated" />
            </ClientOnly>
          </div>
        </div>

        <div class="flex w-full items-center justify-between" :style="{ maxWidth: boardSize + 'px' }">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">{{ loadedGame?.headers?.White || $t('white') }}</span>
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
          <UButton v-if="!analysis && analysisStatus === 'idle' && loadedGame" :label="$t('analyze')" icon="i-lucide-brain" variant="outline" size="sm" @click="startEngineAnalysis" />
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
import type { AnalyzedMove } from '~/types'

const { parsePgn } = usePgn()
const { t } = useI18n()

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
const currentMoveIndex = ref(0)
const analysisStatus = ref<'idle' | 'analyzing' | 'completed' | 'failed'>('idle')
const progress = ref(0)
const analysis = ref<{ analyzedMoves: AnalyzedMove[]; evaluations: number[]; accuracy: { white: number; black: number } } | null>(null)

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

const formatEval = (cp: number) => {
  if (Math.abs(cp) >= 90000) {
    return cp > 0 ? `+M${Math.round((100000 - cp) / 100)}` : `-M${Math.round((cp + 100000) / 100)}`
  }
  return (cp > 0 ? '+' : '') + (cp / 100).toFixed(1)
}

const qualityBadge = (quality: string) => {
  switch (quality) {
    case 'best': return 'bg-success/20 text-success'
    case 'good': return 'bg-info/20 text-info'
    case 'inaccuracy': return 'bg-warning/20 text-warning'
    case 'mistake': return 'bg-warning/20 text-warning'
    case 'blunder': return 'bg-error/20 text-error'
    default: return 'bg-accented text-default'
  }
}

const gameContainer = ref<HTMLElement | null>(null)
const { boardSize } = useBoardSize(gameContainer, 160)

const buildPositions = (moves: { from: string; to: string; promotion?: string; san: string }[]) => {
  const chess = new Chess()
  positions.value = [chess.fen()]
  sanMoves.value = []
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
  boardApi.value.setPosition(positions.value[index])
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
  analysis.value = null
  analysisStatus.value = 'idle'
  progress.value = 0

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
  analysis.value = null
  analysisStatus.value = 'idle'
  progress.value = 0

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
    currentMoveIndex.value = 0

    if (boardApi.value) {
      showPosition(0)
    }
  } catch {
    errorMessage.value = t('invalidFen')
    loadedGame.value = null
  }
}

const startEngineAnalysis = async () => {
  if (!loadedGame.value?.moves?.length) return

  analysisStatus.value = 'analyzing'
  progress.value = 0
  analysis.value = null

  const moves = loadedGame.value.moves
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

      const quality: AnalyzedMove['quality'] = wcLoss < 0.02 ? 'best'
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

const retryAnalysis = () => {
  startEngineAnalysis()
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

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goNext() }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev() }
  else if (e.key === 'Home') { e.preventDefault(); goFirst() }
  else if (e.key === 'End') { e.preventDefault(); goLast() }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.board-area .chess-board-wrap {
  width: 100%;
  height: 100%;
}
</style>
