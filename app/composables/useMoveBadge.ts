import type { Key } from 'chessground/types'
import type { DrawShape } from 'chessground/draw'

type MoveQuality = 'brilliant' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

const BADGE_COLORS: Record<MoveQuality, string> = {
  brilliant: '#26d4a2',
  best: '#98bc5a',
  good: '#97af8b',
  inaccuracy: '#f7c631',
  mistake: '#e6923a',
  blunder: '#ca3531',
}

const QUALITY_SYMBOLS: Record<MoveQuality, string> = {
  brilliant: '!!',
  best: '!',
  good: '',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
}

export function makeBadgeSvg(quality: MoveQuality): string {
  const bg = BADGE_COLORS[quality]
  const sym = QUALITY_SYMBOLS[quality]
  if (!sym) return ''
  const fs = sym.length > 1 ? 13 : 17
  return `<circle cx="78" cy="22" r="15" fill="${bg}" opacity="0.95"/>` +
    `<circle cx="78" cy="22" r="15" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.8"/>` +
    `<text x="78" y="28" text-anchor="middle" fill="#fff" font-size="${fs}" font-weight="bold" font-family="sans-serif">${sym}</text>`
}

export function createMoveBadge(destSquare: string, quality: MoveQuality): DrawShape | null {
  const svg = makeBadgeSvg(quality)
  if (!svg) return null
  return { orig: destSquare as Key, customSvg: { html: svg } }
}
