<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between rounded-lg bg-elevated px-3 py-2">
      <span class="text-sm font-medium text-default">{{ $t('moves') }}</span>
      <span class="text-sm text-muted">{{ analyzedMoves.length }}</span>
    </div>

    <div
      ref="scrollContainer"
      class="mt-2 flex-1 overflow-y-auto rounded-lg bg-default p-2"
    >
      <div v-if="analyzedMoves.length === 0" class="py-4 text-center text-sm text-muted">
        {{ $t('noMovesYet') }}
      </div>
      <table v-else class="w-full text-sm 2xl:text-base">
        <tbody>
          <tr
            v-for="(pair, i) in pairedMoves"
            :key="i"
          >
            <td class="w-8 text-right text-muted tabular-nums">{{ i + 1 }}.</td>
            <td
              class="cursor-pointer rounded px-2 py-0.5"
              :class="moveClass(pair.whiteIdx)"
              @click="$emit('goToMove', pair.whiteIdx + 1)"
            >
              <span :class="qualityDot(pair.white?.quality)" class="mr-1 inline-block size-2 rounded-full" />
              <span class="piece-icon">{{ pieceIcon(pair.white?.san) }}</span>{{ pair.white?.san }}
            </td>
            <td
              v-if="pair.black"
              class="cursor-pointer rounded px-2 py-0.5"
              :class="moveClass(pair.blackIdx)"
              @click="$emit('goToMove', pair.blackIdx + 1)"
            >
              <span :class="qualityDot(pair.black.quality)" class="mr-1 inline-block size-2 rounded-full" />
              <span class="piece-icon">{{ pieceIcon(pair.black?.san) }}</span>{{ pair.black.san }}
            </td>
            <td v-else class="px-2 py-0.5" />
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalyzedMove } from '~/types'

const props = defineProps<{
  analyzedMoves: AnalyzedMove[]
  currentMoveIndex: number
}>()

defineEmits<{ goToMove: [index: number] }>()

const scrollContainer = ref<HTMLElement | null>(null)

const pieceIcon = (san?: string): string => {
  if (!san) return ''
  if (san.startsWith('N')) return '♞'
  if (san.startsWith('B')) return '♝'
  if (san.startsWith('R')) return '♜'
  if (san.startsWith('Q')) return '♛'
  if (san.startsWith('K') || san.startsWith('O')) return '♚'
  if (/^[a-h]/.test(san)) return '♟'
  return ''
}

const pairedMoves = computed(() => {
  const pairs: {
    white: AnalyzedMove | null
    whiteIdx: number
    black: AnalyzedMove | null
    blackIdx: number
  }[] = []
  for (let i = 0; i < props.analyzedMoves.length; i += 2) {
    pairs.push({
      white: props.analyzedMoves[i] ?? null,
      whiteIdx: i,
      black: props.analyzedMoves[i + 1] ?? null,
      blackIdx: i + 1,
    })
  }
  return pairs
})

const qualityDot = (quality?: string) => {
  switch (quality) {
    case 'best': return 'bg-success'
    case 'good': return 'bg-info'
    case 'inaccuracy': return 'bg-warning'
    case 'mistake': return 'bg-warning'
    case 'blunder': return 'bg-error'
    default: return 'bg-muted'
  }
}

const moveClass = (moveIdx: number) => {
  return moveIdx + 1 === props.currentMoveIndex ? 'bg-accented' : 'hover:bg-elevated/50'
}

watch(() => props.currentMoveIndex, async () => {
  await nextTick()
  if (scrollContainer.value) {
    const active = scrollContainer.value.querySelector('.bg-accented')
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
})
</script>

<style scoped>
.piece-icon {
  display: inline-block;
  width: 1em;
  text-align: center;
  margin-right: 1px;
  font-size: 0.85em;
  opacity: 0.7;
}
</style>
