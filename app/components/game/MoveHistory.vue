<template>
  <div class="flex h-full flex-col">
  <div class="flex items-center justify-between rounded-lg bg-gray-800 p-2" role="status" aria-label="Move count">
    <div class="flex-1 text-center text-sm text-gray-400">
      {{ moves.length }} moves
    </div>
  </div>

  <div class="mt-2 flex-1 max-h-96  overflow-y-scroll rounded-lg bg-gray-900 p-2" role="list" aria-label="Move history">
    <div v-if="moves.length === 0" class="py-4 text-center text-sm text-gray-500">
      No moves yet
    </div>
    <div v-else class="grid grid-cols-2 gap-1">
        <template v-for="(move, i) in moves" :key="i">
          <div
            class="rounded px-2 py-1 text-sm"
            :class="i === moves.length - 1 ? 'bg-gray-700' : ''"
            role="listitem"
          >
          <span class="text-gray-500">{{ Math.floor(i / 2) + 1 }}{{ i % 2 === 0 ? '.' : '...' }}</span>
          {{ typeof move === 'string' ? move : move.san }}
        </div>
      </template>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ moves: (string | { san: string })[] }>()
</script>
