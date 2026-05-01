import { ref, onUnmounted, nextTick, watch, type Ref } from 'vue'

const SIDEBAR_WIDTH = 320
const INFO_BARS_HEIGHT = 72
const GAP = 16
const PADDING = 16

export function useBoardSize(containerRef: Ref<HTMLElement | null>, extraHeight: number = 0) {
  const boardSize = ref(400)
  const isMobile = ref(false)
  const isLandscape = ref(false)

  let observer: ResizeObserver | null = null

  const update = () => {
    const el = containerRef.value
    if (!el) return

    const containerW = el.clientWidth
    const containerH = el.clientHeight
    const desktop = window.innerWidth >= 1024
    isMobile.value = !desktop
    isLandscape.value = !desktop && window.innerWidth > window.innerHeight

    let maxSize: number

    if (desktop) {
      const availW = containerW - SIDEBAR_WIDTH - GAP
      const availH = containerH - INFO_BARS_HEIGHT - GAP - extraHeight
      maxSize = Math.min(availW, availH)
    } else {
      const availW = containerW
      const availH = containerH - INFO_BARS_HEIGHT - GAP - extraHeight
      maxSize = Math.min(availW, availH)
    }

    boardSize.value = Math.round(Math.max(maxSize, 200))
  }

  watch(containerRef, (el) => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    if (el) {
      observer = new ResizeObserver(update)
      observer.observe(el)
      nextTick(update)
    }
  }, { immediate: true })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  })

  return { boardSize, isMobile, isLandscape }
}
