export function useChessClock() {
  const whiteTime = ref(0)
  const blackTime = ref(0)
  let timerInterval: ReturnType<typeof setInterval> | null = null
  let lastTick: number = 0

  const formatTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const startTimer = (
    activeColor: () => 'white' | 'black',
    onStop?: () => void,
  ) => {
    stopTimer()
    lastTick = Date.now()
    timerInterval = setInterval(() => {
      const now = Date.now()
      const delta = now - lastTick
      lastTick = now

      if (activeColor() === 'white') {
        whiteTime.value = Math.max(0, whiteTime.value - delta)
      } else {
        blackTime.value = Math.max(0, blackTime.value - delta)
      }

      if (whiteTime.value <= 0 || blackTime.value <= 0) {
        onStop?.()
        stopTimer()
      }
    }, 100)
  }

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  const resetClock = (baseMs: number) => {
    stopTimer()
    whiteTime.value = baseMs
    blackTime.value = baseMs
  }

  onUnmounted(stopTimer)

  return {
    whiteTime,
    blackTime,
    formatTime,
    startTimer,
    stopTimer,
    resetClock,
  }
}
