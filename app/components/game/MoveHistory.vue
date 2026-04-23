<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2" role="status" aria-label="Move count">
      <span class="text-sm font-medium text-gray-300">Moves</span>
      <span class="text-sm text-gray-500">{{ moves.length }}</span>
    </div>

    <div
      ref="scrollContainer"
      class="mt-2 flex-1 overflow-y-auto rounded-lg bg-gray-900 p-2"
      role="list"
      aria-label="Move history"
    >
      <div v-if="moves.length === 0" class="py-4 text-center text-sm text-gray-500">
        No moves yet
      </div>
      <table v-else class="w-full text-sm">
        <tbody>
          <tr
            v-for="(pair, i) in pairedMoves"
            :key="i"
            class="hover:bg-gray-800/50"
          >
            <td class="w-8 text-right text-gray-500 tabular-nums">{{ i + 1 }}.</td>
            <td
              class="rounded px-2 py-0.5"
              :class="pair.white.isLast ? 'bg-gray-700' : ''"
            >{{ pair.white.san }}</td>
            <td
              v-if="pair.black"
              class="rounded px-2 py-0.5"
              :class="pair.black.isLast ? 'bg-gray-700' : ''"
            >{{ pair.black.san }}</td>
            <td v-else class="px-2 py-0.5" />
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
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
