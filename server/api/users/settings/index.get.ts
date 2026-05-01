import { users } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const user = await db.select({ settings: users.settings }).from(users).where(eq(users.id, session.user.id)).then(r => r[0])
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return user.settings || {}
})
