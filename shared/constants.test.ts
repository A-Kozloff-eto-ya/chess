import { describe, it, expect } from 'vitest'
import { parseTimeControl, DEFAULT_TIME_CONTROL } from './constants'

describe('parseTimeControl', () => {
  it('parses standard 10+0 time control', () => {
    const tc = parseTimeControl('10+0')
    expect(tc.base).toBe(10 * 60 * 1000)
    expect(tc.increment).toBe(0)
  })

  it('parses 5+3 time control', () => {
    const tc = parseTimeControl('5+3')
    expect(tc.base).toBe(5 * 60 * 1000)
    expect(tc.increment).toBe(3000)
  })

  it('parses 1+0 bullet', () => {
    const tc = parseTimeControl('1+0')
    expect(tc.base).toBe(60 * 1000)
    expect(tc.increment).toBe(0)
  })

  it('parses 30+0', () => {
    const tc = parseTimeControl('30+0')
    expect(tc.base).toBe(30 * 60 * 1000)
  })

  it('defaults to 10 min on invalid input', () => {
    const tc = parseTimeControl('')
    expect(tc.base).toBe(10 * 60 * 1000)
  })
})

describe('DEFAULT_TIME_CONTROL', () => {
  it('is 10+0', () => {
    expect(DEFAULT_TIME_CONTROL).toBe('10+0')
  })
})
