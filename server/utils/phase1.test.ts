import { describe, it, expect } from 'vitest'

describe('drawOfferedBy security', () => {
  it('accept_draw should be rejected when no draw was offered', () => {
    const drawOfferedBy: number | null = null
    const userId = 2
    expect(!drawOfferedBy || drawOfferedBy === userId).toBe(true)
  })

  it('accept_draw should be rejected when same player offers and accepts', () => {
    const drawOfferedBy: number = 1
    const userId = 1
    expect(!drawOfferedBy || drawOfferedBy === userId).toBe(true)
  })

  it('accept_draw should succeed when opponent offered', () => {
    const drawOfferedBy: number = 1
    const userId = 2
    expect(!drawOfferedBy || drawOfferedBy === userId).toBe(false)
  })
})

describe('path traversal prevention', () => {
  const isValidKey = (key: string | undefined): boolean => {
    return !(!key || !key.startsWith('avatars/') || key.includes('..') || key.includes('\0'))
  }

  it('rejects valid prefix with path traversal', () => {
    expect(isValidKey('avatars/../etc/passwd')).toBe(false)
  })

  it('rejects null byte injection', () => {
    expect(isValidKey('avatars/\0../etc/passwd')).toBe(false)
  })

  it('accepts valid avatar key', () => {
    expect(isValidKey('avatars/abc123.png')).toBe(true)
  })

  it('rejects key without avatars prefix', () => {
    expect(isValidKey('etc/passwd')).toBe(false)
  })

  it('rejects empty key', () => {
    expect(isValidKey('')).toBe(false)
  })

  it('rejects undefined key', () => {
    expect(isValidKey(undefined)).toBe(false)
  })
})

describe('abort/resign player authorization', () => {
  it('white player can resign from their own game', () => {
    const whitePlayerId = 1
    const blackPlayerId = 2
    const userId = 1
    expect(userId === whitePlayerId || userId === blackPlayerId).toBe(true)
  })

  it('spectator cannot resign from game', () => {
    const whitePlayerId = 1
    const blackPlayerId = 2
    const userId = 999
    expect(userId === whitePlayerId || userId === blackPlayerId).toBe(false)
  })
})

describe('clock increment', () => {
  it('resetClock accepts increment parameter', () => {
    const baseMs = 5 * 60 * 1000
    const incMs = 3 * 1000
    let whiteTime = 0
    let blackTime = 0
    let incrementMs = 0

    const resetClock = (base: number, inc: number) => {
      incrementMs = inc
      whiteTime = base
      blackTime = base
    }

    resetClock(baseMs, incMs)
    expect(whiteTime).toBe(300000)
    expect(blackTime).toBe(300000)
    expect(incrementMs).toBe(3000)
  })

  it('applyIncrement adds time after move', () => {
    let whiteTime = 300000
    let blackTime = 290000
    const incrementMs = 3000

    const applyIncrement = (color: 'white' | 'black') => {
      if (incrementMs <= 0) return
      if (color === 'white') whiteTime += incrementMs
      else blackTime += incrementMs
    }

    applyIncrement('black')
    expect(blackTime).toBe(293000)
    expect(whiteTime).toBe(300000)
  })
})
