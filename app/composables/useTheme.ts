import { useLocalStorage } from '@vueuse/core'

const NEUTRAL_COLORS = ['slate', 'gray', 'zinc', 'neutral', 'stone'] as const
const PRIMARY_COLORS = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'
] as const
const RADIUSES = [0, 0.125, 0.25, 0.375, 0.5] as const

const DEFAULT_PRIMARY = 'green'
const DEFAULT_NEUTRAL = 'slate'
const DEFAULT_RADIUS = 0.25

function swapColorsInDOM(primaryColor: string | null, neutralColor: string | null) {
  if (!import.meta.client) return

  const colorsEl = document.querySelector<HTMLStyleElement>('style#nuxt-ui-colors')
  if (!colorsEl) return

  let html = colorsEl.innerHTML

  if (primaryColor && primaryColor !== 'black') {
    html = html.replace(
      /(--ui-color-primary-\d{2,3}:\s*var\(--color-)\w+(-\d{2,3}[^)]*\))/g,
      `$1${primaryColor}$2`
    )
  }
  if (neutralColor) {
    const neutralCssName = neutralColor === 'neutral' ? 'old-neutral' : neutralColor
    html = html.replace(
      /(--ui-color-neutral-\d{2,3}:\s*var\(--color-)\w+(-\d{2,3}[^)]*\))/g,
      `$1${neutralCssName}$2`
    )
  }

  colorsEl.innerHTML = html
}

export function useTheme() {
  const appConfig = useAppConfig()
  const colorMode = useColorMode()

  const _radius = useLocalStorage('nuxt-ui-radius', DEFAULT_RADIUS)
  const _blackAsPrimary = useLocalStorage('nuxt-ui-black-as-primary', false)

  if (import.meta.client) {
    const savedPrimary = localStorage.getItem('nuxt-ui-primary')
    const savedNeutral = localStorage.getItem('nuxt-ui-neutral')
    if (savedPrimary) appConfig.ui.colors.primary = savedPrimary
    if (savedNeutral) appConfig.ui.colors.neutral = savedNeutral

    if (savedPrimary || savedNeutral) {
      const trySwap = () => swapColorsInDOM(
        savedPrimary && savedPrimary !== DEFAULT_PRIMARY ? savedPrimary : null,
        savedNeutral && savedNeutral !== DEFAULT_NEUTRAL ? savedNeutral : null
      )
      const el = document.querySelector<HTMLStyleElement>('style#nuxt-ui-colors')
      if (el) trySwap()
      else requestAnimationFrame(trySwap)
    }
  }

  const neutral = computed({
    get() {
      return appConfig.ui.colors.neutral
    },
    set(option: string) {
      appConfig.ui.colors.neutral = option
      if (import.meta.client) {
        localStorage.setItem('nuxt-ui-neutral', option)
        swapColorsInDOM(null, option !== DEFAULT_NEUTRAL ? option : null)
      }
    }
  })

  const primary = computed({
    get() {
      return appConfig.ui.colors.primary
    },
    set(option: string) {
      appConfig.ui.colors.primary = option
      if (import.meta.client) {
        localStorage.setItem('nuxt-ui-primary', option)
        swapColorsInDOM(option !== DEFAULT_PRIMARY ? option : null, null)
        setBlackAsPrimary(false)
      }
    }
  })

  const radius = computed({
    get() {
      return _radius.value
    },
    set(option: number) {
      _radius.value = option
    }
  })

  const blackAsPrimary = computed(() => _blackAsPrimary.value)

  function setBlackAsPrimary(value: boolean) {
    _blackAsPrimary.value = value
  }

  const mode = computed({
    get() {
      return colorMode.preference
    },
    set(option: string) {
      colorMode.preference = option
    }
  })

  const radiusStyle = computed(() => `:root { --ui-radius: ${_radius.value}rem; }`)
  const blackAsPrimaryStyle = computed(() =>
    _blackAsPrimary.value
      ? ':root { --ui-primary: black; } .dark { --ui-primary: white; }'
      : ':root {}'
  )

  const style = computed(() => [
    { innerHTML: radiusStyle.value, id: 'nuxt-ui-radius', tagPriority: -2 },
    { innerHTML: blackAsPrimaryStyle.value, id: 'nuxt-ui-black-as-primary', tagPriority: -2 }
  ])

  const hasCSSChanges = computed(() =>
    _radius.value !== DEFAULT_RADIUS || _blackAsPrimary.value
  )

  const hasConfigChanges = computed(() =>
    appConfig.ui.colors.primary !== DEFAULT_PRIMARY
    || appConfig.ui.colors.neutral !== DEFAULT_NEUTRAL
  )

  function exportCSS(): string {
    const lines = [
      '@import "tailwindcss";',
      '@import "@nuxt/ui";'
    ]

    const rootLines: string[] = []
    if (_radius.value !== DEFAULT_RADIUS) {
      rootLines.push(`  --ui-radius: ${_radius.value}rem;`)
    }
    if (_blackAsPrimary.value) {
      rootLines.push('  --ui-primary: black;')
    }
    if (rootLines.length) {
      lines.push('', ':root {', ...rootLines, '}')
    }

    if (_blackAsPrimary.value) {
      lines.push('', '.dark {', '  --ui-primary: white;', '}')
    }

    return lines.join('\n')
  }

  function exportConfig(): string {
    const colors: Record<string, string> = {}
    if (appConfig.ui.colors.primary !== DEFAULT_PRIMARY) colors.primary = appConfig.ui.colors.primary
    if (appConfig.ui.colors.neutral !== DEFAULT_NEUTRAL) colors.neutral = appConfig.ui.colors.neutral

    const config: Record<string, any> = {}
    if (Object.keys(colors).length) config.ui = { colors }

    const configString = JSON.stringify(config, null, 2)
      .replace(/"([^"]+)":/g, '$1:')
      .replace(/"/g, "'")

    return `export default defineAppConfig(${configString})`
  }

  function resetTheme() {
    appConfig.ui.colors.primary = DEFAULT_PRIMARY
    if (import.meta.client) {
      localStorage.removeItem('nuxt-ui-primary')
      localStorage.removeItem('nuxt-ui-neutral')
      swapColorsInDOM(DEFAULT_PRIMARY, DEFAULT_NEUTRAL)
    }

    appConfig.ui.colors.neutral = DEFAULT_NEUTRAL
    _radius.value = DEFAULT_RADIUS
    _blackAsPrimary.value = false
  }

  return {
    style,
    neutralColors: NEUTRAL_COLORS,
    neutral,
    primaryColors: PRIMARY_COLORS,
    primary,
    blackAsPrimary,
    setBlackAsPrimary,
    radiuses: RADIUSES,
    radius,
    mode,
    hasCSSChanges,
    hasConfigChanges,
    exportCSS,
    exportConfig,
    resetTheme
  }
}
