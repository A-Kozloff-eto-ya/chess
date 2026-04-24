<template>
  <div class="flex flex-col gap-8">
    <h1 class="text-2xl font-bold">{{ $t('settings') }}</h1>

    <section class="flex flex-col gap-4">
      <h2 class="flex items-center gap-2 text-lg font-semibold text-gray-300">
        <UIcon name="i-lucide-chess-board" class="size-5" />
        {{ $t('boardTheme') }}
      </h2>
      <div class="flex flex-wrap gap-3">
        <button
          v-for="key in boardTheme.themeNames"
          :key="key"
          class="group relative h-14 w-14 overflow-hidden rounded-lg border-2 transition-all"
          :class="currentBoardTheme === key ? 'border-amber-400 ring-1 ring-amber-400/50' : 'border-gray-700 hover:border-gray-500'"
          :aria-label="boardTheme.themes[key].name"
          @click="boardTheme.setTheme(key)"
        >
          <div class="absolute inset-0" :style="{ backgroundColor: boardTheme.themes[key].light }" />
          <div class="absolute inset-0 board-checker-pattern" />
          <UIcon
            v-if="currentBoardTheme === key"
            name="i-lucide-check"
            class="absolute inset-0 m-auto size-5 text-gray-900 drop-shadow-sm"
          />
        </button>
      </div>
    </section>

    <USeparator />

    <section class="flex flex-col gap-4">
      <h2 class="flex items-center gap-2 text-lg font-semibold text-gray-300">
        <UIcon name="i-lucide-volume-2" class="size-5" />
        {{ $t('sound') }}
      </h2>
      <div class="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3">
        <span>{{ $t('enabled') }}</span>
        <USwitch :model-value="appSettings.soundsEnabled" @update:model-value="updateSetting('soundsEnabled', !appSettings.soundsEnabled)" />
      </div>
      <div class="flex flex-col gap-2 rounded-lg bg-gray-800 px-4 py-3">
        <div class="flex items-center justify-between">
          <span>{{ $t('volume') }}</span>
          <span class="text-sm text-gray-400">{{ volumePercent }}%</span>
        </div>
        <USlider
          :model-value="appSettings.soundsVolume"
          :min="0"
          :max="1"
          :step="0.05"
          :disabled="!appSettings.soundsEnabled"
          @update:model-value="updateVolume"
        />
      </div>
    </section>

    <USeparator />

    <section class="flex flex-col gap-4">
      <h2 class="flex items-center gap-2 text-lg font-semibold text-gray-300">
        <UIcon name="i-lucide-languages" class="size-5" />
        {{ $t('language') }}
      </h2>
      <div class="flex gap-2">
        <UButton
          v-for="loc in availableLocales"
          :key="loc.code"
          :label="loc.name"
          :variant="locale === loc.code ? 'solid' : 'outline'"
          :icon="loc.code === 'en' ? 'i-lucide-globe' : 'i-lucide-globe-2'"
          @click="setLanguage(loc.code)"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { loggedIn } = useUserSession()
const { locale } = useI18n()
const { settings: settingsRef, update } = useSettings()
const boardTheme = useBoardTheme()

const appSettings = computed(() => settingsRef.value)

const currentBoardTheme = computed(() => settingsRef.value.boardTheme)

const volumePercent = computed(() => Math.round(settingsRef.value.soundsVolume * 100))

const updateSetting = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
  update(key, value)
}

const updateVolume = (val: number | number[]) => {
  update('soundsVolume', Array.isArray(val) ? val[0] : val)
}

const availableLocales = [
  { code: 'en' as const, name: 'English' },
  { code: 'ru' as const, name: 'Русский' },
]

const setLanguage = (code: 'en' | 'ru') => {
  locale.value = code
  update('language', code)
}

onMounted(() => {
  if (!loggedIn.value) {
    navigateTo('/')
  }
})
</script>
