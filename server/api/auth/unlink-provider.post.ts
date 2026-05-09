import { z } from 'zod'
import { users, userOauthAccounts } from '../../db/schema'
import { eq, and } from 'drizzle-orm'

const schema = z.object({
  provider: z.string(),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const account = await db.select()
    .from(userOauthAccounts)
    .where(and(eq(userOauthAccounts.userId, session.user.id), eq(userOauthAccounts.provider, parsed.data.provider)))
    .then(r => r[0])

  if (!account) {
    throw createError({ statusCode: 404, statusMessage: 'Linked account not found' })
  }

  const allAccounts = await db.select()
    .from(userOauthAccounts)
    .where(eq(userOauthAccounts.userId, session.user.id))

  const user = await db.select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .then(r => r[0])

  if (!user?.passwordHash && allAccounts.length <= 1) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot unlink the only login method. Set a password first.' })
  }

  await db.delete(userOauthAccounts).where(eq(userOauthAccounts.id, account.id))

  return { success: true }
})
