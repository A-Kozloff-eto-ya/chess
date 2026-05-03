<template>
  <div v-if="pieceList.length > 0 || adv !== 0" class="flex items-center gap-px text-xs leading-none select-none">
    <span v-for="(p, i) in pieceList" :key="i" class="opacity-60">{{ p }}</span>
    <span v-if="adv > 0" class="ml-0.5 text-muted font-medium">+{{ adv }}</span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  captured: Record<string, number>
  color: 'white' | 'black'
  materialDiff?: number
}>()

const SYMBOLS: Record<string, Record<string, string>> = {
  black: { q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
  white: { q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
}

const pieceList = computed(() => {
  const result: string[] = []
  const syms = SYMBOLS[props.color === 'white' ? 'black' : 'white']!
  for (const t of ['q', 'r', 'b', 'n', 'p']) {
    const n = props.captured[t] || 0
    for (let i = 0; i < n; i++) result.push(syms[t]!)
  }
  return result
})

const adv = computed(() => {
  const d = props.materialDiff ?? 0
  return props.color === 'white' ? d : -d
})
</script>
