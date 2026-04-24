<template>
  <div class="eval-graph-container" :style="{ width: width + 'px' }">
    <svg :width="width" :height="height" class="eval-graph-svg">
      <rect x="0" y="0" :width="width" :height="height" fill="#111827" rx="4" />
      <line x1="0" :y1="midY" :x2="width" :y2="midY" stroke="#374151" stroke-width="1" />

      <template v-if="evaluations.length > 1">
        <polygon :points="areaPoints" fill="url(#whiteGrad)" opacity="0.3" />
        <polyline :points="linePoints" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-linejoin="round" />
      </template>

      <line v-if="currentIndex >= 0 && evaluations.length > 1"
        :x1="indexToX(currentIndex)" y1="0" :x2="indexToX(currentIndex)" :y2="height"
        stroke="#fbbf24" stroke-width="1" opacity="0.7" />
      <circle v-if="currentIndex >= 0 && evaluations.length > 1"
        :cx="indexToX(currentIndex)" :cy="evalToY(evaluations[currentIndex] ?? 0)"
        r="3" fill="#fbbf24" />

      <defs>
        <linearGradient id="whiteGrad" x1="0" y1="0" x2="0" :y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4" />
          <stop offset="50%" stop-color="#ffffff" stop-opacity="0.1" />
          <stop offset="50%" stop-color="#000000" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  evaluations: number[]
  currentIndex: number
  width?: number
}>(), {
  width: 500,
})

const height = 100
const midY = height / 2
const padding = 4

const evalToY = (evalCp: number): number => {
  const clamped = Math.max(-1000, Math.min(1000, evalCp))
  return midY - (clamped / 1000) * (midY - padding)
}

const indexToX = (index: number): number => {
  if (props.evaluations.length <= 1) return padding
  return padding + (index / (props.evaluations.length - 1)) * (props.width - 2 * padding)
}

const linePoints = computed(() => {
  return props.evaluations.map((ev, i) => `${indexToX(i)},${evalToY(ev)}`).join(' ')
})

const areaPoints = computed(() => {
  if (props.evaluations.length === 0) return ''
  const top = props.evaluations.map((ev, i) => `${indexToX(i)},${evalToY(ev)}`).join(' ')
  const bottom = [`${indexToX(props.evaluations.length - 1)},${midY}`, `${indexToX(0)},${midY}`].join(' ')
  return `${top} ${bottom}`
})
</script>

<style scoped>
.eval-graph-container {
  flex-shrink: 0;
}
.eval-graph-svg {
  display: block;
  border-radius: 4px;
}
</style>
