<template>
  <div class="eval-bar-container">
    <div class="eval-bar-track">
      <div
        class="eval-bar-black"
        :style="{ height: `${blackPercent}%` }"
      >
        <span v-if="evalLabel" class="eval-label eval-label-black">{{ evalLabel }}</span>
      </div>
      <div class="eval-bar-white">
        <span v-if="evalLabel" class="eval-label eval-label-white">{{ evalLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  evaluation: { type: 'cp' | 'mate'; value: number } | null
  flipped?: boolean
}>()

const evalLabel = computed(() => {
  if (!props.evaluation) return ''
  if (props.evaluation.type === 'mate') {
    const v = props.evaluation.value
    return v > 0 ? `+M${v}` : `-M${Math.abs(v)}`
  }
  const cp = props.evaluation.value
  if (Math.abs(cp) >= 100) {
    return (cp > 0 ? '+' : '') + (cp / 100).toFixed(1)
  }
  return (cp > 0 ? '+' : '') + cp / 100
})

const blackPercent = computed(() => {
  if (!props.evaluation) return 50

  let cp: number
  if (props.evaluation.type === 'mate') {
    cp = props.evaluation.value > 0 ? 10000 : -10000
  } else {
    cp = props.evaluation.value
  }

  if (props.flipped) cp = -cp

  const clamped = Math.max(-1000, Math.min(1000, cp))
  const pct = 50 + 50 * (2 / (1 + Math.exp(-0.00368 * clamped)) - 1)
  return 100 - pct
})
</script>

<style scoped>
.eval-bar-container {
  width: 28px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  align-self: stretch;
}

.eval-bar-track {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.eval-bar-black {
  background: #000;
  transition: height 0.6s ease;
  position: relative;
  min-height: 0;
}

.eval-bar-white {
  background: #fff;
  flex: 1;
  position: relative;
  min-height: 0;
}

.eval-label {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
  font-family: monospace;
}

.eval-label-black {
  bottom: 2px;
  color: var(--ui-text-highlighted);
}

.eval-label-white {
  top: 2px;
  color: var(--ui-text-inverted);
}
</style>
