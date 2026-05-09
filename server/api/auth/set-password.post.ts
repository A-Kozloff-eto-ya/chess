import { z } from 'zod'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

const schema = z.object({
  newPassword: z.string().min(8),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const user = await db.select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .then(r => r[0])

  if (user?.passwordHash) {
    throw createError({ statusCode: 400, statusMessage: 'Password already set. Use change-password instead.' })
  }

  const passwordHash = await hashPassword(parsed.data.newPassword)
  await db.update(users).set({ passwordHash }).where(eq(users.id, session.user.id))

  return { success: true }
})
