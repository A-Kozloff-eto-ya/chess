import { describe, it, expect } from 'vitest'
import { validateMove, isGameOver, generatePgn, getFenAfterMoves, createChessInstance } from './chess.js'

describe('validateMove', () => {
  it('accepts a valid opening move e2-e4', () => {
    const result = validateMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2', 'e4')
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.move.san).toBe('e4')
    }
  })

  it('rejects an illegal move', () => {
    const result = validateMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2', 'e5')
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toBe('Invalid move')
    }
  })

  it('returns new FEN after valid move', () => {
    const result = validateMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2', 'e4')
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.fen).toContain('4P3')
    }
  })
})

describe('isGameOver', () => {
  it('detects starting position as not game over', () => {
    const result = isGameOver('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    expect(result.gameOver).toBe(false)
    expect(result.checkmate).toBe(false)
  })

  it('detects fools mate as checkmate', () => {
    const foolsMate = 'rnbqkbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'
    const result = isGameOver(foolsMate)
    expect(result.gameOver).toBe(true)
    expect(result.checkmate).toBe(true)
  })

  it('detects stalemate', () => {
    const stalemate = 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1'
    const result = isGameOver(stalemate)
    expect(result.gameOver).toBe(true)
    expect(result.stalemate).toBe(true)
  })
})

describe('generatePgn', () => {
  it('generates PGN from SAN moves', () => {
    const pgn = generatePgn(['e4', 'e5', 'Nf3'])
    expect(pgn).toContain('1. e4 e5 2. Nf3')
  })

  it('returns PGN headers for no moves', () => {
    const pgn = generatePgn([])
    expect(pgn).toContain('[Event "?"]')
  })
})

describe('getFenAfterMoves', () => {
  it('returns starting FEN for no moves', () => {
    const fen = getFenAfterMoves([])
    expect(fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  })

  it('returns correct FEN after e4 e5', () => {
    const fen = getFenAfterMoves(['e4', 'e5'])
    expect(fen).toContain('pppp1ppp')
    expect(fen).toContain('4P3')
  })
})

describe('createChessInstance', () => {
  it('creates default position without FEN', () => {
    const chess = createChessInstance()
    expect(chess.fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  })

  it('creates position from FEN', () => {
    const chess = createChessInstance('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')
    expect(chess.fen()).toContain('4P3')
  })
})
