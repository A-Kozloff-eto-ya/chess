type SoundName = 'move' | 'capture' | 'check' | 'checkmate' | 'error'

const buffers = new Map<SoundName, AudioBuffer>()

export function useSounds() {
  const { settings } = useSettings()
  let audioCtx: AudioContext | null = null

  const getCtx = (): AudioContext => {
    if (!audioCtx) audioCtx = new AudioContext()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx
  }

  const ensureBuffer = async (name: SoundName): Promise<AudioBuffer | null> => {
    if (buffers.has(name)) return buffers.get(name)!
    try {
      const res = await fetch(`/sounds/${name}.mp3`)
      const buf = await res.arrayBuffer()
      const decoded = await getCtx().decodeAudioData(buf)
      buffers.set(name, decoded)
      return decoded
    } catch {
      return null
    }
  }

  onMounted(() => {
    for (const name of ['move', 'capture', 'check', 'checkmate', 'error'] as SoundName[]) {
      ensureBuffer(name)
    }
  })

  const play = (name: SoundName) => {
    if (!settings.value.soundsEnabled) return
    const buffer = buffers.get(name)
    if (!buffer) return
    try {
      const ctx = getCtx()
      const source = ctx.createBufferSource()
      source.buffer = buffer
      const gain = ctx.createGain()
      gain.gain.value = settings.value.soundsVolume
      source.connect(gain)
      gain.connect(ctx.destination)
      source.start()
    } catch {}
  }

  return {
    enabled: computed(() => settings.value.soundsEnabled),
    volume: computed(() => settings.value.soundsVolume),
    move: () => play('move'),
    capture: () => play('capture'),
    check: () => play('check'),
    checkmate: () => play('checkmate'),
    illegal: () => play('error'),
  }
}
