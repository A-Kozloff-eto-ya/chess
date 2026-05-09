<template>
  <div class="flex flex-col max-h-48 lg:max-h-96">
    <div class="flex items-center justify-between rounded-lg bg-elevated px-3 py-2" role="status" aria-label="Move count">
      <span class="text-sm font-medium text-default">{{ $t('moves') }}</span>
      <span class="text-sm text-muted">{{ moves.length }}</span>
    </div>

    <div
      ref="scrollContainer"
      class="mt-2 flex-1 overflow-y-auto rounded-lg bg-default p-2"
      role="list"
      aria-label="Move history"
    >
      <div v-if="moves.length === 0" class="py-4 text-center text-sm text-muted">
        {{ $t('noMovesYet') }}
      </div>
      <table v-else class="w-full text-sm 2xl:text-base">
        <tbody>
          <tr
            v-for="(pair, i) in pairedMoves"
            :key="i"
            class="hover:bg-elevated/50"
          >
            <td class="w-8 text-right text-muted tabular-nums">{{ i + 1 }}.</td>
            <td
              class="rounded px-2 py-0.5"
              :class="pair.white.isLast ? 'bg-accented' : ''"
            ><span class="piece-icon">{{ pieceIcon(pair.white.san) }}</span>{{ pair.white.san }}</td>
            <td
              v-if="pair.black"
              class="rounded px-2 py-0.5"
              :class="pair.black.isLast ? 'bg-accented' : ''"
            ><span class="piece-icon">{{ pieceIcon(pair.black.san) }}</span>{{ pair.black.san }}</td>
            <td v-else class="px-2 py-0.5" />
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { pieceIcon } from '~/utils/chess-ui'

const props = defineProps<{ moves: (string | { san: string })[] }>()

const scrollContainer = ref<HTMLElement | null>(null)

const toSan = (m: string | { san: string }): string => typeof m === 'string' ? m : m.san

const pairedMoves = computed(() => {
  const pairs: { white: { san: string; isLast: boolean }; black?: { san: string; isLast: boolean } }[] = []
  for (let i = 0; i < props.moves.length; i += 2) {
    const pair: typeof pairs[number] = {
      white: { san: toSan(props.moves[i]!), isLast: i === props.moves.length - 1 },
    }
    if (i + 1 < props.moves.length) {
      pair.black = { san: toSan(props.moves[i + 1]!), isLast: i + 1 === props.moves.length - 1 }
    }
    pairs.push(pair)
  }
  return pairs
})

watch(() => props.moves.length, async () => {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
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
