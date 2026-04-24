export function useSounds() {
  const { settings } = useSettings()
  let audioCtx: AudioContext | null = null

  const getCtx = () => {
    if (!audioCtx) {
      audioCtx = new AudioContext()
    }
    return audioCtx
  }

  const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) => {
    if (!settings.value.soundsEnabled) return
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.value = frequency
      gain.gain.value = volume * settings.value.soundsVolume
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    } catch {}
  }

  const playNoise = (duration: number, volume = 0.08) => {
    if (!settings.value.soundsEnabled) return
    try {
      const ctx = getCtx()
      const bufferSize = ctx.sampleRate * duration
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
      }
      const source = ctx.createBufferSource()
      source.buffer = buffer
      const gain = ctx.createGain()
      gain.gain.value = volume * settings.value.soundsVolume
      source.connect(gain)
      gain.connect(ctx.destination)
      source.start()
    } catch {}
  }

  const move = () => playNoise(0.05, 0.1)
  const capture = () => {
    playNoise(0.08, 0.15)
    playTone(300, 0.08, 'square', 0.06)
  }
  const check = () => {
    playTone(800, 0.1, 'square', 0.12)
    setTimeout(() => playTone(600, 0.15, 'square', 0.1), 100)
  }
  const checkmate = () => {
    playTone(500, 0.2, 'square', 0.15)
    setTimeout(() => playTone(400, 0.2, 'square', 0.12), 200)
    setTimeout(() => playTone(300, 0.4, 'square', 0.1), 400)
  }
  const illegal = () => playTone(200, 0.15, 'sawtooth', 0.08)

  const toggle = () => {
    settings.value = { ...settings.value, soundsEnabled: !settings.value.soundsEnabled }
  }

  return {
    enabled: computed(() => settings.value.soundsEnabled),
    volume: computed(() => settings.value.soundsVolume),
    move,
    capture,
    check,
    checkmate,
    illegal,
    toggle,
  }
}
