<script setup lang="ts">
const colorMode = useColorMode()
const { t } = useI18n()
const open = ref(false)
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

const {
  neutralColors,
  neutral,
  primaryColors,
  primary,
  blackAsPrimary,
  setBlackAsPrimary,
  radiuses,
  radius,
  mode,
  hasCSSChanges,
  hasConfigChanges,
  exportCSS,
  exportConfig,
  resetTheme
} = useTheme()
</script>

<template>
  <UPopover v-model:open="open" :ui="{ content: 'w-72 px-6 py-4 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-5rem)]' }">
    <template #default>
      <UButton
        icon="i-lucide-swatch-book"
        color="neutral"
        :variant="open ? 'soft' : 'ghost'"
        square
        aria-label="Theme picker"
        :ui="{ leadingIcon: 'text-primary' }"
      />
    </template>

    <template #content>
      <fieldset>
        <legend class="text-[11px] leading-none font-semibold mb-2 select-none">{{ $t('themePrimary') }}</legend>
        <div class="grid grid-cols-3 gap-1 -mx-2">
          <CommonThemePickerButton
            :label="$t('themeBlack')"
            :selected="blackAsPrimary"
            @click="setBlackAsPrimary(true)"
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
            :selected="!blackAsPrimary && primary === color"
            @click="primary = color"
          />
        </div>
      </fieldset>

      <fieldset>
        <legend class="text-[11px] leading-none font-semibold mb-2 select-none">{{ $t('themeNeutral') }}</legend>
        <div class="grid grid-cols-3 gap-1 -mx-2">
          <CommonThemePickerButton
            v-for="color in neutralColors"
            :key="color"
            :label="$t('color_' + color)"
            :chip="color"
            :selected="neutral === color"
            @click="neutral = color"
          />
        </div>
      </fieldset>

      <fieldset>
        <legend class="text-[11px] leading-none font-semibold mb-2 select-none">{{ $t('themeRadius') }}</legend>
        <div class="grid grid-cols-5 gap-1 -mx-2">
          <CommonThemePickerButton
            v-for="r in radiuses"
            :key="r"
            :label="String(r)"
            class="justify-center px-0"
            :selected="radius === r"
            @click="radius = r"
          />
        </div>
      </fieldset>

      <fieldset>
        <legend class="text-[11px] leading-none font-semibold mb-2 select-none">{{ $t('themeColorMode') }}</legend>
        <div class="grid grid-cols-3 gap-1 -mx-2">
          <CommonThemePickerButton
            :label="$t('themeLight')"
            icon="i-lucide-sun"
            :selected="colorMode.preference === 'light'"
            @click="mode = 'light'"
          />
          <CommonThemePickerButton
            :label="$t('themeDark')"
            icon="i-lucide-moon"
            :selected="colorMode.preference === 'dark'"
            @click="mode = 'dark'"
          />
          <CommonThemePickerButton
            :label="$t('themeSystem')"
            icon="i-lucide-monitor"
            :selected="colorMode.preference === 'system'"
            @click="mode = 'system'"
          />
        </div>
      </fieldset>

      <fieldset v-if="hasCSSChanges || hasConfigChanges">
        <legend class="text-[11px] leading-none font-semibold mb-2 select-none">{{ $t('themeExport') }}</legend>
        <div class="flex items-center justify-between gap-1 -mx-2">
          <UButton
            v-if="hasCSSChanges"
            color="neutral"
            variant="soft"
            size="sm"
            label="main.css"
            class="flex-1 text-[11px]"
            :icon="copiedCSS ? 'i-lucide-copy-check' : 'i-lucide-copy'"
            @click="copyToClipboard(exportCSS(), 'css')"
          />
          <UButton
            v-if="hasConfigChanges"
            color="neutral"
            variant="soft"
            size="sm"
            label="app.config.ts"
            class="flex-1 text-[11px]"
            :icon="copiedConfig ? 'i-lucide-copy-check' : 'i-lucide-copy'"
            @click="copyToClipboard(exportConfig(), 'config')"
          />
          <UTooltip :text="$t('themeResetTheme')">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-rotate-ccw"
              class="ms-auto ring-default hover:bg-elevated/50"
              @click="resetTheme"
            />
          </UTooltip>
        </div>
      </fieldset>
    </template>
  </UPopover>
</template>
