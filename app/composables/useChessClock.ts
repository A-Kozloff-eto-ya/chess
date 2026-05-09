export function useChessClock() {
  const whiteTime = ref(0)
  const blackTime = ref(0)
  let timerInterval: ReturnType<typeof setInterval> | null = null
  let lastTick: number = 0
  let incrementMs = 0

  const formatTime = (ms: number) => {
    if (ms <= 0) return '0:00.0'
    const totalSeconds = Math.floor(ms / 1000)
    const tenths = Math.floor((ms % 1000) / 100)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    if (ms < 10000) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const applyIncrement = (color: 'white' | 'black') => {
    if (incrementMs <= 0) return
    if (color === 'white') {
      whiteTime.value += incrementMs
    } else {
      blackTime.value += incrementMs
    }
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

  const resetClock = (baseMs: number, incMs: number = 0) => {
    stopTimer()
    incrementMs = incMs
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
    applyIncrement,
  }
}
