import { users, userOauthAccounts } from '../../db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const email = query.email as string

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Email is required' })
  }

  const user = await db.select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .then(r => r[0])

  return { hasPassword: !!user?.passwordHash }
})
