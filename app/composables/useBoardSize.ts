import { ref, onUnmounted, nextTick, watch, type Ref } from 'vue'

const BOARD_AREA_OVERHEAD = 36
const SIDEBAR_WIDTH = 320
const INFO_BARS_HEIGHT = 72
const GAP = 16

export function useBoardSize(containerRef: Ref<HTMLElement | null>, extraHeight: number = 0) {
  const boardSize = ref(400)

  let observer: ResizeObserver | null = null

  const update = () => {
    const el = containerRef.value
    if (!el) return

    const containerW = el.clientWidth
    const containerH = el.clientHeight
    const isDesktop = window.innerWidth >= 1024

    let maxSize: number

    if (isDesktop) {
      const availW = containerW - SIDEBAR_WIDTH - GAP - BOARD_AREA_OVERHEAD
      const availH = containerH - INFO_BARS_HEIGHT - GAP - extraHeight
      maxSize = Math.min(availW, availH)
    } else {
      maxSize = containerW - BOARD_AREA_OVERHEAD
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

  return { boardSize }
}
