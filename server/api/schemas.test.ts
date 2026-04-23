import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const engineSchema = z.object({
  sanMoves: z.string().min(1).optional(),
  uciMoves: z.string().regex(/^[a-h1-8 @]+(?:\s+[a-h1-8 @]+)*$/).optional(),
  movetime: z.number().int().min(100).max(5000).default(1000),
  elo: z.number().int().min(100).max(3500).optional(),
})

const moveSchema = z.object({
  from: z.string().min(2).max(2),
  to: z.string().min(2).max(2),
  promotion: z.string().optional(),
})

const joinSchema = z.object({
  inviteCode: z.string().length(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8),
})

describe('Engine Schema', () => {
  it('accepts valid engine params', () => {
    const result = engineSchema.safeParse({ sanMoves: 'e4 e5', movetime: 1000, elo: 1500 })
    expect(result.success).toBe(true)
  })

  it('applies default movetime', () => {
    const result = engineSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.movetime).toBe(1000)
  })

  it('rejects movetime below 100', () => {
    const result = engineSchema.safeParse({ movetime: 50 })
    expect(result.success).toBe(false)
  })

  it('rejects movetime above 5000', () => {
    const result = engineSchema.safeParse({ movetime: 6000 })
    expect(result.success).toBe(false)
  })

  it('rejects elo below 100', () => {
    const result = engineSchema.safeParse({ elo: 50 })
    expect(result.success).toBe(false)
  })

  it('rejects elo above 3500', () => {
    const result = engineSchema.safeParse({ elo: 4000 })
    expect(result.success).toBe(false)
  })

  it('accepts UCI moves', () => {
    const result = engineSchema.safeParse({ uciMoves: 'e2e4 e7e5' })
    expect(result.success).toBe(true)
  })
})

describe('Move Schema', () => {
  it('accepts valid move', () => {
    const result = moveSchema.safeParse({ from: 'e2', to: 'e4' })
    expect(result.success).toBe(true)
  })

  it('accepts promotion move', () => {
    const result = moveSchema.safeParse({ from: 'e7', to: 'e8', promotion: 'q' })
    expect(result.success).toBe(true)
  })

  it('rejects 1-char square', () => {
    const result = moveSchema.safeParse({ from: 'e', to: 'e4' })
    expect(result.success).toBe(false)
  })

  it('rejects 3-char square', () => {
    const result = moveSchema.safeParse({ from: 'e22', to: 'e4' })
    expect(result.success).toBe(false)
  })
})

describe('Join Schema', () => {
  it('accepts 6-char code', () => {
    const result = joinSchema.safeParse({ inviteCode: 'ABC123' })
    expect(result.success).toBe(true)
  })

  it('rejects short code', () => {
    const result = joinSchema.safeParse({ inviteCode: 'ABC12' })
    expect(result.success).toBe(false)
  })

  it('rejects long code', () => {
    const result = joinSchema.safeParse({ inviteCode: 'ABC1234' })
    expect(result.success).toBe(false)
  })
})

describe('Login Schema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: 'pass' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-email', password: 'pass' })
    expect(result.success).toBe(false)
  })
})

describe('Register Schema', () => {
  it('accepts valid registration', () => {
    const result = registerSchema.safeParse({ username: 'player1', email: 't@t.com', password: '12345678' })
    expect(result.success).toBe(true)
  })

  it('rejects short username', () => {
    const result = registerSchema.safeParse({ username: 'ab', email: 't@t.com', password: '12345678' })
    expect(result.success).toBe(false)
  })

  it('rejects short password', () => {
    const result = registerSchema.safeParse({ username: 'player1', email: 't@t.com', password: '1234567' })
    expect(result.success).toBe(false)
  })

  it('rejects long username', () => {
    const result = registerSchema.safeParse({ username: 'a'.repeat(31), email: 't@t.com', password: '12345678' })
    expect(result.success).toBe(false)
  })
})
