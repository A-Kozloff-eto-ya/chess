const windows = new Map<string, { count: number; resetAt: number }>()

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of windows) {
    if (now > entry.resetAt) {
      windows.delete(key)
    }
  }
}, 60_000)

function getIP(event: { node: { req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } } } }): string {
  const forwarded = event.node.req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return (forwarded.split(',')[0] ?? '').trim()
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return (forwarded[0]!.split(',')[0] ?? '').trim()
  }
  return event.node.req.socket?.remoteAddress || 'unknown'
}

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = windows.get(key)

  if (!entry || now > entry.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  entry.count++
  return entry.count > limit
}

const RULES: { pattern: RegExp; limit: number; windowMs: number }[] = [
  { pattern: /^POST \/api\/auth\/login/, limit: 5, windowMs: 60_000 },
  { pattern: /^POST \/api\/auth\/register/, limit: 5, windowMs: 60_000 },
  { pattern: /^POST \/api\/engine\/bestmove/, limit: 100, windowMs: 60_000 },
  { pattern: /^POST \/api\/games\/?$/, limit: 20, windowMs: 60_000 },
  { pattern: /^POST \/api\/games\/join/, limit: 20, windowMs: 60_000 },
  { pattern: /^\/api\//, limit: 120, windowMs: 60_000 },
]

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return

  const method = event.method
  const path = event.path
  const key = `${method} ${path}`
  const clientId = getIP(event as Parameters<typeof getIP>[0])

  for (const rule of RULES) {
    if (rule.pattern.test(key)) {
      const rateKey = `${clientId}:${rule.pattern.source}`
      if (isRateLimited(rateKey, rule.limit, rule.windowMs)) {
        throw createError({
          statusCode: 429,
          statusMessage: 'Too many requests. Please try again later.',
        })
      }
      break
    }
  }
})
