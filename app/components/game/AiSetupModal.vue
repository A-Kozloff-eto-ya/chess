<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6">
        <h2 class="mb-4 text-lg font-semibold">{{ $t('playVsAI') }}</h2>
        <p class="mb-3 text-sm text-muted">{{ $t('chooseDifficulty') }}</p>
        <div class="mb-3 flex flex-wrap gap-2">
          <button v-for="preset in eloPresets" :key="preset.value"
            class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
            :class="selectedElo === preset.value ? 'border-primary bg-elevated text-primary' : 'border-default text-default hover:border-accented'"
            @click="selectedElo = preset.value">
            {{ preset.label }}
          </button>
        </div>
        <UFormField :label="$t('aiElo')">
          <USlider v-model="selectedElo" :min="1350" :max="3300" :step="50" />
          <div class="mt-1 flex justify-between text-xs text-muted">
            <span>1350</span>
            <span>{{ selectedElo }}</span>
            <span>3300</span>
          </div>
        </UFormField>
        <p class="mb-3 mt-4 text-sm text-muted">{{ $t('chooseYourColor') }}</p>
        <div class="mb-4 flex gap-3">
          <button class="flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors"
            :class="aiColor === 'white' ? 'border-primary bg-elevated' : 'border-default hover:border-accented'"
            @click="aiColor = 'white'">
            <span class="text-4xl">&#9812;</span>
            <span class="text-sm font-medium">{{ $t('white') }}</span>
          </button>
          <button class="flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors"
            :class="aiColor === 'black' ? 'border-primary bg-elevated' : 'border-default hover:border-accented'"
            @click="aiColor = 'black'">
            <span class="text-4xl">&#9818;</span>
            <span class="text-sm font-medium">{{ $t('black') }}</span>
          </button>
        </div>
        <UButton :label="$t('startGame')" class="w-full" @click="startGame" />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const { t } = useI18n()

const selectedElo = ref(1500)
const aiColor = ref<'white' | 'black'>('white')

const eloPresets = computed(() => [
  { label: t('beginner', { elo: 1350 }), value: 1350 },
  { label: t('casual', { elo: 1500 }), value: 1500 },
  { label: t('club', { elo: 1800 }), value: 1800 },
  { label: t('expert', { elo: 2200 }), value: 2200 },
  { label: t('master', { elo: 2700 }), value: 2700 },
  { label: t('superGM', { elo: 3300 }), value: 3300 },
])

const ELO_MIN = 1350
const ELO_MAX = 3300
const MOVETIME_MIN = 300
const MOVETIME_MAX = 3000

const computeMovetime = (elo: number) =>
  Math.round(MOVETIME_MIN + (elo - ELO_MIN) / (ELO_MAX - ELO_MIN) * (MOVETIME_MAX - MOVETIME_MIN))

const startGame = () => {
  open.value = false
  navigateTo({ path: '/play-ai', query: { elo: selectedElo.value, color: aiColor.value, movetime: computeMovetime(selectedElo.value) } })
}
</script>
