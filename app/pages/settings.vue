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
        <UIcon name="i-lucide-swatch-book" class="size-5" />
        {{ $t('appearance') }}
      </h2>

      <div class="flex flex-col gap-3 rounded-lg bg-elevated px-4 py-3">
        <fieldset>
          <legend class="text-sm font-medium mb-2">{{ $t('themePrimary') }}</legend>
          <div class="flex flex-wrap gap-1.5">
            <CommonThemePickerButton
              :label="$t('themeBlack')"
              :selected="blackAsPrimary"
              @click="onSetBlackAsPrimary"
            >
              <template #leading>
                <span class="inline-block size-2 rounded-full bg-black dark:bg-white" />
              </template>
            </CommonThemePickerButton>
            <CommonThemePickerButton
              v-for="color in primaryColors"
              :key="color"
              :label="$t('color_' + color)"
              :chip="color"
              :selected="!blackAsPrimary && themePrimary === color"
              @click="onSetPrimary(color)"
            />
          </div>
        </fieldset>
      </div>

      <div class="flex flex-col gap-3 rounded-lg bg-elevated px-4 py-3">
        <fieldset>
          <legend class="text-sm font-medium mb-2">{{ $t('themeNeutral') }}</legend>
          <div class="flex flex-wrap gap-1.5">
            <CommonThemePickerButton
              v-for="color in neutralColors"
              :key="color"
              :label="$t('color_' + color)"
              :chip="color"
              :selected="themeNeutral === color"
              @click="onSetNeutral(color)"
            />
          </div>
        </fieldset>
      </div>

      <div class="flex flex-col gap-3 rounded-lg bg-elevated px-4 py-3">
        <fieldset>
          <legend class="text-sm font-medium mb-2">{{ $t('themeRadius') }}</legend>
          <div class="flex gap-1.5">
            <CommonThemePickerButton
              v-for="r in radiuses"
              :key="r"
              :label="String(r)"
              class="justify-center px-3"
              :selected="themeRadius === r"
              @click="onSetRadius(r)"
            />
          </div>
        </fieldset>
      </div>

      <div class="flex flex-col gap-3 rounded-lg bg-elevated px-4 py-3">
        <fieldset>
          <legend class="text-sm font-medium mb-2">{{ $t('themeColorMode') }}</legend>
          <div class="flex gap-1.5">
            <CommonThemePickerButton
              :label="$t('themeLight')"
              icon="i-lucide-sun"
              :selected="themeColorMode === 'light'"
              @click="onSetColorMode('light')"
            />
            <CommonThemePickerButton
              :label="$t('themeDark')"
              icon="i-lucide-moon"
              :selected="themeColorMode === 'dark'"
              @click="onSetColorMode('dark')"
            />
            <CommonThemePickerButton
              :label="$t('themeSystem')"
              icon="i-lucide-monitor"
              :selected="themeColorMode === 'system'"
              @click="onSetColorMode('system')"
            />
          </div>
        </fieldset>
      </div>

      <div v-if="hasCSSChanges || hasConfigChanges" class="flex items-center gap-2">
        <UButton
          v-if="hasCSSChanges"
          color="neutral"
          variant="soft"
          size="sm"
          label="main.css"
          class="flex-1 text-xs"
          :icon="copiedCSS ? 'i-lucide-copy-check' : 'i-lucide-copy'"
          @click="copyToClipboard(exportCSS(), 'css')"
        />
        <UTooltip :text="$t('themeResetTheme')">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-rotate-ccw"
            @click="onResetTheme"
          />
        </UTooltip>
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

const {
  neutralColors,
  neutral: themeNeutral,
  primaryColors,
  primary: themePrimary,
  blackAsPrimary,
  setBlackAsPrimary,
  radiuses,
  radius: themeRadius,
  mode: themeColorMode,
  hasCSSChanges,
  hasConfigChanges,
  exportCSS,
  exportConfig,
  resetTheme
} = useTheme()

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

const onSetPrimary = (color: string) => {
  themePrimary.value = color
  update('primary', color)
}

const onSetNeutral = (color: string) => {
  themeNeutral.value = color
  update('neutral', color)
}

const onSetRadius = (r: number) => {
  themeRadius.value = r
  update('radius', r)
}

const onSetColorMode = (m: 'light' | 'dark' | 'system') => {
  themeColorMode.value = m
  update('colorMode', m)
}

const onSetBlackAsPrimary = () => {
  setBlackAsPrimary(true)
}

const onResetTheme = () => {
  resetTheme()
  update('primary', 'green')
  update('neutral', 'slate')
  update('radius', 0.25)
  update('colorMode', 'system')
}

const copiedCSS = ref(false)
const copiedConfig = ref(false)

async function copyToClipboard(text: string, flag: 'css' | 'config') {
  await navigator.clipboard.writeText(text)
  if (flag === 'css') {
    copiedCSS.value = true
    setTimeout(() => copiedCSS.value = false, 2000)
  } else {
    copiedConfig.value = true
    setTimeout(() => copiedConfig.value = false, 2000)
  }
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
