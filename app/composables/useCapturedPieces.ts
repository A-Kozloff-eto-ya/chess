const STARTING: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 }
const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

function countPieces(fen: string) {
  const w: Record<string, number> = {}
  const b: Record<string, number> = {}
  for (const ch of (fen.split(' ')[0] ?? '')) {
    if ('PNBRQK'.includes(ch)) { const l = ch.toLowerCase(); w[l] = (w[l] || 0) + 1 }
    else if ('pnbrqk'.includes(ch)) { b[ch] = (b[ch] || 0) + 1 }
  }
  return { w, b }
}

export function useCapturedPieces(fen: Ref<string>) {
  return computed(() => {
    const { w, b } = countPieces(fen.value)
    const whiteCaptured: Record<string, number> = {}
    const blackCaptured: Record<string, number> = {}
    let wm = 0, bm = 0
    for (const t of ['q', 'r', 'b', 'n', 'p']) {
      const bc = STARTING[t]! - (b[t] || 0)
      if (bc > 0) { whiteCaptured[t] = bc; wm += bc * VALUES[t]! }
      const wc = STARTING[t]! - (w[t] || 0)
      if (wc > 0) { blackCaptured[t] = wc; bm += wc * VALUES[t]! }
    }
    return { white: whiteCaptured, black: blackCaptured, materialDiff: wm - bm }
  })
}
