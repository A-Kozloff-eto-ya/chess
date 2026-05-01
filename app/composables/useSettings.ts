export interface AppSettings {
  soundsEnabled: boolean
  soundsVolume: number
  language: 'en' | 'ru'
  primary: string
  neutral: string
  radius: number
  colorMode: 'light' | 'dark' | 'system'
}

const DEFAULTS: AppSettings = {
  soundsEnabled: true,
  soundsVolume: 0.7,
  language: 'en',
  primary: 'green',
  neutral: 'slate',
  radius: 0.25,
  colorMode: 'system',
}

const STORAGE_KEY = 'chess-settings'
let initialized = false
let saveTimeout: ReturnType<typeof setTimeout> | null = null

export function useSettings() {
  const state = useState<AppSettings>('app-settings', () => ({ ...DEFAULTS }))
  const { loggedIn } = useUserSession()
  const { locale } = useI18n()
  const {
    primary: themePrimary,
    neutral: themeNeutral,
    radius: themeRadius,
    mode: themeColorMode,
  } = useTheme()

  const applyThemeSettings = () => {
    const s = state.value

    if (s.primary && themePrimary.value !== s.primary) {
      themePrimary.value = s.primary
    }
    if (s.neutral && themeNeutral.value !== s.neutral) {
      themeNeutral.value = s.neutral
    }
    if (s.radius !== undefined && themeRadius.value !== s.radius) {
      themeRadius.value = s.radius
    }
    if (s.colorMode && themeColorMode.value !== s.colorMode) {
      themeColorMode.value = s.colorMode
    }
    if (s.language) {
      locale.value = s.language
    }
  }

  const loadFromStorage = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        delete parsed.theme
        delete parsed.boardTheme
        state.value = { ...DEFAULTS, ...parsed }
      }
    } catch {}
  }

  const loadFromServer = async () => {
    try {
      const serverSettings = await $fetch<Record<string, any>>('/api/users/settings')
      if (serverSettings && Object.keys(serverSettings).length > 0) {
        state.value = { ...DEFAULTS, ...serverSettings as Partial<AppSettings> }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
      }
    } catch {}
  }

  const saveToStorage = () => {
    if (import.meta.server) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
    } catch {}
  }

  const saveToServer = () => {
    if (import.meta.server || !loggedIn.value) return
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(async () => {
      try {
        await $fetch('/api/users/settings', {
          method: 'PUT',
          body: state.value,
        })
      } catch {}
    }, 500)
  }

  if (import.meta.client && !initialized) {
    initialized = true

    loadFromStorage()
    applyThemeSettings()

    if (loggedIn.value) {
      loadFromServer().then(() => applyThemeSettings())
    }

    watch(state, () => {
      saveToStorage()
      if (loggedIn.value) {
        saveToServer()
      }
    }, { deep: true })
  }

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    state.value = { ...state.value, [key]: value }
  }

  return { settings: state, update }
}
