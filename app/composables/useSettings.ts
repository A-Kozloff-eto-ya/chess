export type BoardTheme = 'brown' | 'blue' | 'green' | 'purple' | 'ic'
export type PieceTheme = 'cburnett' | 'tatiana' | 'maestro' | 'pirouetti'

export interface AppSettings {
  soundsEnabled: boolean
  soundsVolume: number
  language: 'en' | 'ru'
  primary: string
  neutral: string
  radius: number
  colorMode: 'light' | 'dark' | 'system'
  boardTheme: BoardTheme
  pieceTheme: PieceTheme
}

const DEFAULTS: AppSettings = {
  soundsEnabled: true,
  soundsVolume: 0.7,
  language: 'en',
  primary: 'green',
  neutral: 'slate',
  radius: 0.25,
  colorMode: 'system',
  boardTheme: 'brown',
  pieceTheme: 'cburnett',
}

let initialized = false
let saveTimeout: ReturnType<typeof setTimeout> | null = null

export function useSettings() {
  const cookie = useCookie<Partial<AppSettings>>('chess-settings', {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })

  const state = useState<AppSettings>('app-settings', () => ({
    ...DEFAULTS,
    ...(cookie.value || {}),
  }))

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

  const loadFromServer = async () => {
    try {
      const serverSettings = await $fetch<Record<string, any>>('/api/users/settings')
      if (serverSettings && Object.keys(serverSettings).length > 0) {
        state.value = { ...DEFAULTS, ...serverSettings as Partial<AppSettings> }
        cookie.value = state.value
      }
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

    applyThemeSettings()

    if (loggedIn.value) {
      loadFromServer().then(() => applyThemeSettings())
    }

    watch(loggedIn, (nowLoggedIn) => {
      if (nowLoggedIn) {
        loadFromServer().then(() => applyThemeSettings())
      }
    })

    watch(state, () => {
      cookie.value = state.value
      if (loggedIn.value) {
        saveToServer()
      }
    }, { deep: true })
  }

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    state.value = { ...state.value, [key]: value }
  }

  const refresh = async () => {
    await loadFromServer()
    applyThemeSettings()
  }

  return { settings: state, update, refresh }
}
