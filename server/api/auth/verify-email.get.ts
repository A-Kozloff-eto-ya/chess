import { eq } from 'drizzle-orm'
import { users, emailVerifications } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = query.token as string

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token' })
  }

  const verification = await db.select().from(emailVerifications).where(eq(emailVerifications.token, token)).then(r => r[0])
  if (!verification) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired token' })
  }

  if (new Date(verification.expiresAt) < new Date()) {
    await db.delete(emailVerifications).where(eq(emailVerifications.id, verification.id))
    throw createError({ statusCode: 400, statusMessage: 'Token expired' })
  }

  const user = await db.select().from(users).where(eq(users.id, verification.userId)).then(r => r[0])
  if (!user || user.emailVerified === 'true') {
    await db.delete(emailVerifications).where(eq(emailVerifications.id, verification.id))
    throw createError({ statusCode: 400, statusMessage: 'Already verified' })
  }

  await db.update(users).set({ emailVerified: 'true' }).where(eq(users.id, verification.userId))
  await db.delete(emailVerifications).where(eq(emailVerifications.id, verification.id))

  return { success: true }
})
