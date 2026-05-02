import { ref, onUnmounted, nextTick, watch, type Ref } from 'vue'

const SIDEBAR_WIDTH = 320
const INFO_BARS_HEIGHT = 72
const GAP = 16

export function useBoardSize(containerRef: Ref<HTMLElement | null>, extraHeight: number = 0) {
  const boardSize = ref(400)
  const isMobile = ref(false)
  const isLandscape = ref(false)

  let observer: ResizeObserver | null = null
  let rafId: number | null = null

  const update = () => {
    rafId = null
    const el = containerRef.value
    if (!el) return

    const desktop = window.innerWidth >= 1024
    isMobile.value = !desktop
    isLandscape.value = !desktop && window.innerWidth > window.innerHeight

    let maxSize: number

    if (desktop) {
      const availW = el.clientWidth - SIDEBAR_WIDTH - GAP
      const availH = el.clientHeight - INFO_BARS_HEIGHT - GAP - extraHeight
      maxSize = Math.min(availW, availH)
    } else {
      const availW = el.clientWidth
      const availH = el.clientHeight - INFO_BARS_HEIGHT - GAP - extraHeight
      maxSize = Math.min(availW, availH)
    }

    const rounded = Math.floor(Math.max(maxSize, 200))
    if (boardSize.value !== rounded) {
      boardSize.value = rounded
    }
  }

  const scheduleUpdate = () => {
    if (rafId !== null) return
    rafId = requestAnimationFrame(update)
  }

  watch(containerRef, (el) => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    if (el) {
      observer = new ResizeObserver(scheduleUpdate)
      observer.observe(el)
      nextTick(update)
    }
  }, { immediate: true })

  onUnmounted(() => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (observer) {
      observer.disconnect()
      observer = null
    }
  })

  return { boardSize, isMobile, isLandscape }
}
