import { describe, it, expect } from 'vitest'
import { calculateNewRating } from './rating.js'

describe('calculateNewRating', () => {
  it('increases winner rating and decreases loser rating', () => {
    const newWinner = calculateNewRating(1200, 1200, 1)
    const newLoser = calculateNewRating(1200, 1200, 0)
    expect(newWinner).toBeGreaterThan(1200)
    expect(newLoser).toBeLessThan(1200)
  })

  it('draw between equal players keeps ratings close', () => {
    const newW = calculateNewRating(1200, 1200, 0.5)
    const newB = calculateNewRating(1200, 1200, 0.5)
    expect(newW).toBe(1200)
    expect(newB).toBe(1200)
  })

  it('upset gives bigger rating change', () => {
    const lowBeatsHigh = calculateNewRating(1000, 2000, 1)
    const highBeatsLow = calculateNewRating(1000, 2000, 1, 30)
    expect(lowBeatsHigh - 1000).toBeGreaterThan(highBeatsLow - 1000)
  })

  it('uses K=40 for new players (< 30 games)', () => {
    const newPlayer = calculateNewRating(1200, 1200, 1, 0)
    expect(newPlayer).toBe(1220)
  })

  it('uses K=20 for established players (>= 30 games, < 2400)', () => {
    const established = calculateNewRating(1200, 1200, 1, 30)
    expect(established).toBe(1210)
  })

  it('uses K=10 for high-rated players (>= 2400)', () => {
    const master = calculateNewRating(2500, 2500, 1, 50)
    expect(master).toBe(2505)
  })

  it('never drops below 100', () => {
    const veryLow = calculateNewRating(101, 3000, 0)
    expect(veryLow).toBeGreaterThanOrEqual(100)
  })

  it('rating change is symmetric for equal players', () => {
    const winner = calculateNewRating(1500, 1500, 1, 30)
    const loser = calculateNewRating(1500, 1500, 0, 30)
    expect(winner - 1500).toBe(-(loser - 1500))
  })
})
