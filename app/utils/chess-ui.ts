import { Chess } from 'chess.js'

export function pieceIcon(san?: string): string {
  if (!san) return ''
  if (san.startsWith('N')) return '♞'
  if (san.startsWith('B')) return '♝'
  if (san.startsWith('R')) return '♜'
  if (san.startsWith('Q')) return '♛'
  if (san.startsWith('K') || san.startsWith('O')) return '♚'
  if (/^[a-h]/.test(san)) return '♟'
  return ''
}

export function qualityBadge(quality: string): string {
  switch (quality) {
    case 'brilliant': return 'bg-emerald-500/20 text-emerald-400'
    case 'best': return 'bg-success/20 text-success'
    case 'good': return 'bg-sky-500/20 text-sky-400'
    case 'inaccuracy': return 'bg-amber-500/20 text-amber-400'
    case 'mistake': return 'bg-orange-500/20 text-orange-400'
    case 'blunder': return 'bg-error/20 text-error'
    default: return 'bg-accented text-default'
  }
}

export function qualityClass(quality?: string): string {
  switch (quality) {
    case 'brilliant': return 'text-emerald-400'
    case 'best': return 'text-success'
    case 'good': return 'text-sky-400'
    case 'inaccuracy': return 'text-amber-400'
    case 'mistake': return 'text-orange-400'
    case 'blunder': return 'text-error'
    default: return 'text-transparent'
  }
}

export function qualitySymbol(quality?: string): string {
  switch (quality) {
    case 'brilliant': return '!!'
    case 'best': return '!'
    case 'good': return '!?'  
    case 'inaccuracy': return '?!'
    case 'mistake': return '?'
    case 'blunder': return '??'
    default: return ''
  }
}

export function formatEval(cp: number): string {
  if (Math.abs(cp) >= 90000) {
    return cp > 0 ? `+M${Math.round((100000 - cp) / 100)}` : `-M${Math.round((cp + 100000) / 100)}`
  }
  return (cp > 0 ? '+' : '') + (cp / 100).toFixed(1)
}

export function parseSanMove(fen: string, san: string): { from: string; to: string } | null {
  try {
    const c = new Chess(fen)
    const m = c.move(san)
    if (m) return { from: m.from, to: m.to }
  } catch {}
  return null
}

export function getAttackedSquares(fen: string): string[] {
  try {
    const c = new Chess(fen)
    const moves = c.moves({ verbose: true })
    return [...new Set(moves.filter(m => m.captured).map(m => m.to))]
  } catch {}
  return []
}
