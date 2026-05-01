import { users } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const SettingsSchema = z.object({
  soundsEnabled: z.boolean().optional(),
  soundsVolume: z.number().min(0).max(1).optional(),
  language: z.enum(['en', 'ru']).optional(),
  primary: z.string().optional(),
  neutral: z.string().optional(),
  radius: z.number().optional(),
  colorMode: z.enum(['light', 'dark', 'system']).optional(),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parsed = SettingsSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid settings' })
  }

  const user = await db.select({ settings: users.settings }).from(users).where(eq(users.id, session.user.id)).then(r => r[0])
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const current = (user.settings || {}) as Record<string, any>
  const merged = { ...current, ...parsed.data }

  await db.update(users).set({ settings: merged }).where(eq(users.id, session.user.id))

  return merged
})
