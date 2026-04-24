export type BoardTheme = 'brown' | 'blue' | 'green' | 'gray' | 'purple'

export interface AppSettings {
  boardTheme: BoardTheme
  soundsEnabled: boolean
  soundsVolume: number
  language: 'en' | 'ru'
}

const DEFAULTS: AppSettings = {
  boardTheme: 'brown',
  soundsEnabled: true,
  soundsVolume: 0.7,
  language: 'en',
}

const STORAGE_KEY = 'chess-settings'

const state = useState<AppSettings>('app-settings', () => ({ ...DEFAULTS }))

let hydrated = false
let watcherSetup = false

export function useSettings() {
  if (!watcherSetup) {
    watcherSetup = true

    onMounted(() => {
      if (hydrated) return
      hydrated = true
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          state.value = { ...DEFAULTS, ...JSON.parse(raw) }
        }
      } catch {}
    })

    watch(state, (val) => {
      if (import.meta.server) return
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      } catch {}
    }, { deep: true })
  }

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    state.value = { ...state.value, [key]: value }
  }

  return { settings: state, update }
}
