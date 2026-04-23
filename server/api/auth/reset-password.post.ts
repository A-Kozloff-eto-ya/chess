import { z } from 'zod'
import { users, passwordResets } from '../../db/schema'
import { eq, and, gt, isNull } from 'drizzle-orm'

const resetSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = resetSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const { token, password } = parsed.data

  const reset = await db.select().from(passwordResets).where(
    and(
      eq(passwordResets.token, token),
      gt(passwordResets.expiresAt, new Date()),
      isNull(passwordResets.usedAt),
    )
  ).then(r => r[0])

  if (!reset) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired reset token' })
  }

  const passwordHash = await hashPassword(password)

  await db.update(users).set({ passwordHash }).where(eq(users.id, reset.userId))

  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, reset.id))

  return { success: true }
})
