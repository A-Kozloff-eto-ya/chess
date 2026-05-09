<template>
  <div v-if="mounted" class="flex flex-col gap-8">
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
        <UIcon name="i-lucide-grid-3x3" class="size-5" />
        {{ $t('boardTheme') }}
      </h2>

      <div class="flex flex-col gap-3 rounded-lg bg-elevated px-4 py-3">
        <fieldset>
          <legend class="text-sm font-medium mb-2">{{ $t('boardTheme') }}</legend>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="bt in boardThemes"
              :key="bt.id"
              class="flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] capitalize transition-colors cursor-pointer bg-elevated"
              :class="appSettings.boardTheme === bt.id ? 'ring-2 ring-primary' : ''"
              @click="onSetBoardTheme(bt.id)"
            >
              <span class="grid grid-cols-2 grid-rows-2 overflow-hidden rounded-sm" style="width:20px;height:20px;">
                <span :style="{ backgroundColor: bt.light }" />
                <span :style="{ backgroundColor: bt.dark }" />
                <span :style="{ backgroundColor: bt.dark }" />
                <span :style="{ backgroundColor: bt.light }" />
              </span>
              {{ $t('board_' + bt.id) }}
            </button>
          </div>
        </fieldset>
      </div>

      <div class="flex flex-col gap-3 rounded-lg bg-elevated px-4 py-3">
        <fieldset>
          <legend class="text-sm font-medium mb-2">{{ $t('pieceTheme') }}</legend>
          <div class="flex flex-wrap gap-1.5">
            <CommonThemePickerButton
              v-for="pt in pieceThemes"
              :key="pt"
              :label="$t('piece_' + pt)"
              :selected="appSettings.pieceTheme === pt"
              @click="onSetPieceTheme(pt)"
            />
          </div>
        </fieldset>
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
        <UIcon name="i-lucide-shield" class="size-5" />
        {{ $t('security') }}
      </h2>

      <div class="flex flex-col gap-3 rounded-lg bg-elevated px-4 py-3">
        <fieldset>
          <legend class="text-sm font-medium mb-2">{{ hasPassword ? $t('changePassword') : $t('setPassword') }}</legend>
          <div class="flex flex-col gap-2">
            <UInput v-if="hasPassword" v-model="passwordForm.current" :type="showPasswords ? 'text' : 'password'" :placeholder="$t('currentPassword')" />
            <UInput v-model="passwordForm.newPass" :type="showPasswords ? 'text' : 'password'" :placeholder="$t('newPassword')" />
            <UInput v-model="passwordForm.confirm" :type="showPasswords ? 'text' : 'password'" :placeholder="$t('confirmNewPassword')" />
            <div class="flex items-center gap-2 mt-1">
              <UButton :label="hasPassword ? $t('changePassword') : $t('setPassword')" size="sm" :loading="passwordLoading" @click="onChangePassword" />
              <UButton :label="showPasswords ? 'Hide' : 'Show'" variant="ghost" size="sm" @click="showPasswords = !showPasswords" />
            </div>
          </div>
        </fieldset>
      </div>

      <div class="flex flex-col gap-3 rounded-lg bg-elevated px-4 py-3">
        <fieldset>
          <legend class="text-sm font-medium mb-2">{{ $t('changeEmail') }}</legend>
          <div class="flex flex-col gap-2">
            <p class="text-xs text-muted">{{ $t('currentEmail') }}: {{ userEmail }}</p>
            <UInput v-model="emailForm.newEmail" type="email" :placeholder="$t('newEmail')" />
            <UInput v-if="hasPassword" v-model="emailForm.password" type="password" :placeholder="$t('currentPassword')" />
            <UButton :label="$t('changeEmail')" size="sm" :loading="emailLoading" @click="onChangeEmail" />
          </div>
        </fieldset>
      </div>

      <div class="rounded-lg bg-elevated px-4 py-3">
        <fieldset>
          <legend class="text-sm font-medium mb-2 text-error">{{ $t('dangerZone') }}</legend>
          <div class="flex flex-col gap-2">
            <p class="text-xs text-muted">{{ $t('deleteAccountDesc') }}</p>
            <div class="flex items-center gap-2">
              <UInput v-if="showDeleteConfirm" v-model="deletePassword" type="password" :placeholder="$t('enterPassword')" class="flex-1" />
              <UButton
                v-if="!showDeleteConfirm"
                :label="$t('deleteAccount')"
                size="sm"
                color="error"
                variant="outline"
                @click="showDeleteConfirm = true"
              />
              <template v-else>
                <UButton :label="$t('confirmDelete')" size="sm" color="error" :loading="deleteLoading" @click="onDeleteAccount" />
                <UButton :label="$t('cancel')" size="sm" variant="ghost" @click="showDeleteConfirm = false; deletePassword = ''" />
              </template>
            </div>
          </div>
        </fieldset>
      </div>
    </section>

    <USeparator />

    <section class="flex flex-col gap-4">
      <h2 class="flex items-center gap-2 text-lg font-semibold text-toned">
        <UIcon name="i-lucide-link" class="size-5" />
        {{ $t('linkedAccounts') }}
      </h2>
      <div class="flex flex-col gap-2 rounded-lg bg-elevated px-4 py-3">
        <div v-for="prov in providerList" :key="prov.id" class="flex items-center justify-between py-1.5">
          <div class="flex items-center gap-2">
            <UIcon :name="prov.icon" class="size-4" />
            <span class="text-sm">{{ prov.label }}</span>
            <span v-if="isLinked(prov.id)" class="text-xs text-muted">({{ getLinkedUsername(prov.id) }})</span>
          </div>
          <div class="flex items-center gap-2">
            <UButton v-if="!isLinked(prov.id)" :label="$t('link')" size="xs" variant="outline" @click="onLinkProvider(prov.id)" />
            <template v-else>
              <USwitch :model-value="isVisible(prov.id)" size="xs" @update:model-value="onToggleVisibility(prov.id, $event)" />
              <span class="text-[10px] text-muted w-10">{{ isVisible(prov.id) ? $t('public') : $t('private') }}</span>
              <UButton :label="$t('unlink')" size="xs" variant="ghost" color="error" @click="onUnlinkProvider(prov.id)" />
            </template>
          </div>
        </div>
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
import type { BoardTheme, PieceTheme } from '~/composables/useSettings'

const { loggedIn } = useUserSession()
const { locale, t } = useI18n()
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

const boardThemes = [
  { id: 'brown' as const, light: '#f0d9b5', dark: '#b58863' },
  { id: 'blue' as const, light: '#dee3e6', dark: '#87a2be' },
  { id: 'green' as const, light: '#ffffdd', dark: '#6ab870' },
  { id: 'purple' as const, light: '#e8e0d8', dark: '#957ebe' },
  { id: 'ic' as const, light: '#eae9d2', dark: '#94a8b6' },
]

const pieceThemes = ['cburnett', 'tatiana', 'maestro', 'pirouetti'] as const

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
  update('boardTheme', 'brown')
  update('pieceTheme', 'cburnett')
}

const onSetBoardTheme = (id: BoardTheme) => {
  update('boardTheme', id)
}

const onSetPieceTheme = (id: PieceTheme) => {
  update('pieceTheme', id)
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

const { data: linkedAccounts, refresh: refreshAccounts } = useFetch<{ provider: string; username: string | null; profileUrl: string | null; visible: boolean }[]>('/api/auth/linked-accounts')

const providerList = [
  { id: 'github', icon: 'i-logos-github-icon', label: 'GitHub' },
  { id: 'google', icon: 'i-logos-google-icon', label: 'Google' },
  { id: 'discord', icon: 'i-logos-discord-icon', label: 'Discord' },
  { id: 'yandex', icon: 'i-logos-yandex-ru', label: 'Yandex' },
]

const isLinked = (provider: string) => linkedAccounts.value?.some(a => a.provider === provider) ?? false
const getLinkedUsername = (provider: string) => linkedAccounts.value?.find(a => a.provider === provider)?.username || ''
const isVisible = (provider: string) => linkedAccounts.value?.find(a => a.provider === provider)?.visible ?? true

const onLinkProvider = (provider: string) => {
  const baseUrl = useRuntimeConfig().public.appUrl || window.location.origin
  const redirectUrl = `${baseUrl}/auth/${provider}`
  window.location.href = redirectUrl
}

const onUnlinkProvider = async (provider: string) => {
  try {
    await $fetch('/api/auth/unlink-provider', { method: 'POST', body: { provider } })
    toast.add({ title: `${t('unlinked')} ${provider}`, color: 'success' })
    refreshAccounts()
  } catch (e: any) {
    toast.add({ title: e.data?.statusMessage || t('unlinkFailed'), color: 'error' })
  }
}

const onToggleVisibility = async (provider: string, visible: boolean) => {
  try {
    await $fetch('/api/auth/linked-accounts-visibility', { method: 'PUT', body: { provider, visible } })
    refreshAccounts()
  } catch (e: any) {
    toast.add({ title: e.data?.statusMessage || t('updateFailed'), color: 'error' })
  }
}

const mounted = ref(false)

const toast = useToast()
const { data: sessionData } = useFetch('/api/auth/session')
const userEmail = computed(() => sessionData.value?.email ?? '')

const { data: hasPasswordData } = useFetch<{ hasPassword: boolean }>('/api/auth/has-password')
const hasPassword = computed(() => hasPasswordData.value?.hasPassword ?? true)

const showPasswords = ref(false)
const passwordLoading = ref(false)
const passwordForm = reactive({ current: '', newPass: '', confirm: '' })

const emailLoading = ref(false)
const emailForm = reactive({ newEmail: '', password: '' })

const showDeleteConfirm = ref(false)
const deletePassword = ref('')
const deleteLoading = ref(false)

const onDeleteAccount = async () => {
  if (!deletePassword.value && hasPassword.value) {
    toast.add({ title: t('enterPassword'), color: 'error' })
    return
  }
  deleteLoading.value = true
  try {
    await $fetch('/api/users/delete', {
      method: 'POST',
      body: { password: deletePassword.value || 'oauth' },
    })
    toast.add({ title: t('accountDeleted'), color: 'success' })
    window.location.href = '/'
  } catch (e: any) {
    toast.add({ title: e.data?.statusMessage || t('deleteFailed'), color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

const onChangePassword = async () => {
  if (passwordForm.newPass !== passwordForm.confirm) {
    toast.add({ title: t('passwordsDoNotMatchNew'), color: 'error' })
    return
  }
  passwordLoading.value = true
  try {
    if (hasPassword.value) {
      await $fetch('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: passwordForm.current, newPassword: passwordForm.newPass },
      })
    } else {
      await $fetch('/api/auth/set-password', {
        method: 'POST',
        body: { newPassword: passwordForm.newPass },
      })
      hasPasswordData.value = { hasPassword: true }
    }
    toast.add({ title: t('passwordChanged'), color: 'success' })
    passwordForm.current = ''
    passwordForm.newPass = ''
    passwordForm.confirm = ''
  } catch (e: any) {
    toast.add({ title: e.data?.statusMessage || t('passwordChangeFailed'), color: 'error' })
  } finally {
    passwordLoading.value = false
  }
}

const onChangeEmail = async () => {
  emailLoading.value = true
  try {
    await $fetch('/api/auth/change-email', {
      method: 'POST',
      body: { password: emailForm.password, newEmail: emailForm.newEmail },
    })
    toast.add({ title: t('emailChangeSent'), color: 'success' })
    emailForm.newEmail = ''
    emailForm.password = ''
  } catch (e: any) {
    toast.add({ title: e.data?.statusMessage || t('emailChangeFailed'), color: 'error' })
  } finally {
    emailLoading.value = false
  }
}

onMounted(() => {
  mounted.value = true
  if (!loggedIn.value) {
    navigateTo('/')
  }
  const route = useRoute()
  if (route.query.error === 'already_linked') {
    toast.add({ title: t('accountAlreadyLinked'), color: 'error' })
    navigateTo('/settings', { replace: true })
  } else if (route.query.linked) {
    toast.add({ title: `${route.query.linked} ${t('linkedSuccess')}`, color: 'success' })
    refreshAccounts()
    navigateTo('/settings', { replace: true })
  }
})
</script>
