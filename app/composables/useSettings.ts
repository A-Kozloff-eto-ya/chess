export interface AppSettings {
  soundsEnabled: boolean
  soundsVolume: number
  language: 'en' | 'ru'
}

const DEFAULTS: AppSettings = {
  soundsEnabled: true,
  soundsVolume: 0.7,
  language: 'en',
}

const STORAGE_KEY = 'chess-settings'

export function useSettings() {
  const state = useState<AppSettings>('app-settings', () => ({ ...DEFAULTS }))

  onMounted(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        delete parsed.theme
        delete parsed.boardTheme
        delete parsed.colorMode
        state.value = { ...DEFAULTS, ...parsed }
      }
    } catch {}
  })

  watch(state, (val) => {
    if (import.meta.server) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    } catch {}
  }, { deep: true })

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    state.value = { ...state.value, [key]: value }
  }

  return { settings: state, update }
}
