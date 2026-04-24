type BT = 'brown' | 'blue' | 'green' | 'gray' | 'purple'

const THEMES: Record<BT, { light: string; name: string }> = {
  brown: { light: '#f0d9b5', name: 'Brown' },
  blue: { light: '#c8d8e4', name: 'Blue' },
  green: { light: '#e8edc8', name: 'Green' },
  gray: { light: '#d0d0d0', name: 'Gray' },
  purple: { light: '#d8c8e8', name: 'Purple' },
}

const SVG_DATA = `url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOng9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHZpZXdCb3g9IjAgMCA4IDgiIHNoYXBlLXJlbmRlcmluZz0iY3Jpc3BFZGdlcyI+PGcgaWQ9ImEiPjxnIGlkPSJiIj48ZyBpZD0iYyI+PGcgaWQ9ImQiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGlkPSJlIiBvcGFjaXR5PSIwIi8+PHVzZSB4PSIxIiB5PSIxIiBocmVmPSIjZSIgeDpocmVmPSIjZSIvPjxyZWN0IHk9IjEiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGlkPSJmIiBvcGFjaXR5PSIwLjM4Ii8+PHVzZSB4PSIxIiB5PSItMSIgaHJlZj0iI2YiIHg6aHJlZj0iI2YiLz48L2c+PHVzZSB4PSIyIiBocmVmPSIjZCIgeDpocmVmPSIjZCIvPjwvZz48dXNlIHg9IjQiIGhyZWY9IiNjIiB4OmhyZWY9IiNjIi8+PC9nPjx1c2UgeT0iMiIgaHJlZj0iI2IiIHg6aHJlZj0iI2IiLz48L2c+PHVzZSB5PSI0IiBocmVmPSIjYSIgeDpocmVmPSIjYSIvPjwvc3ZnPg==')`

let observer: MutationObserver | null = null

function applyToAllBoards(color: string) {
  if (import.meta.server) return
  document.querySelectorAll('cg-board').forEach((el) => {
    const htmlEl = el as HTMLElement
    htmlEl.style.backgroundColor = color
    htmlEl.style.backgroundImage = SVG_DATA
  })
}

function ensureObserver(getColor: () => string) {
  if (import.meta.server || observer) return
  applyToAllBoards(getColor())
  observer = new MutationObserver(() => {
    if (document.querySelector('cg-board')) {
      applyToAllBoards(getColor())
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

export function useBoardTheme() {
  const { settings, update } = useSettings()

  const themes = THEMES
  const themeNames = Object.keys(THEMES) as BT[]

  const currentColor = () => THEMES[settings.value.boardTheme].light

  const setTheme = (t: BT) => {
    update('boardTheme', t)
  }

  onMounted(() => {
    applyToAllBoards(currentColor())
    ensureObserver(currentColor)
  })

  watch(() => settings.value.boardTheme, () => {
    applyToAllBoards(currentColor())
  })

  return {
    theme: computed(() => settings.value.boardTheme),
    themes,
    themeNames,
    setTheme,
  }
}
