<template>
  <div class="flex flex-col gap-8">
    <h1 class="text-2xl font-bold">{{ $t('settings') }}</h1>

    <section class="flex flex-col gap-4">
      <h2 class="flex items-center gap-2 text-lg font-semibold text-toned">
        <UIcon name="i-lucide-volume-2" class="size-5" />
        {{ $t('sound') }}
      </h2>
      <div class="flex items-center justify-between rounded-lg bg-elevated px-4 py-3">
        <span>{{ $t('enabled') }}</span>
        <USwitch :model-value="appSettings.soundsEnabled" @update:model-value="updateSetting('soundsEnabled', !appSettings.soundsEnabled)" />
      </div>
      <div class="flex flex-col gap-2 rounded-lg bg-elevated px-4 py-3">
        <div class="flex items-center justify-between">
          <span>{{ $t('volume') }}</span>
          <span class="text-sm text-muted">{{ volumePercent }}%</span>
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
      <h2 class="flex items-center gap-2 text-lg font-semibold text-toned">
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

const appSettings = computed(() => settingsRef.value)

const volumePercent = computed(() => Math.round(settingsRef.value.soundsVolume * 100))

const updateSetting = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
  update(key, value)
}

const updateVolume = (val: number | number[] | undefined) => {
  if (val == null) return
  const v = Array.isArray(val) ? val[0] : val
  if (v != null) update('soundsVolume', v)
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
