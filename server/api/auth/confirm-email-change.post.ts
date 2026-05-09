import { z } from 'zod'
import { users } from '../../db/schema'
import { eq, and, gt, isNotNull } from 'drizzle-orm'

const schema = z.object({
  token: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const user = await db.select({
    id: users.id,
    pendingEmail: users.pendingEmail,
    emailChangeToken: users.emailChangeToken,
    emailChangeExpires: users.emailChangeExpires,
  }).from(users).where(
    and(
      eq(users.emailChangeToken, parsed.data.token),
      isNotNull(users.pendingEmail),
    )
  ).then(r => r[0])

  if (!user || !user.emailChangeExpires || new Date(user.emailChangeExpires) < new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired token' })
  }

  await db.update(users).set({
    email: user.pendingEmail,
    emailVerified: 'true',
    pendingEmail: null,
    emailChangeToken: null,
    emailChangeExpires: null,
  }).where(eq(users.id, user.id))

  const updated = await db.select({
    id: users.id,
    username: users.username,
    email: users.email,
    avatar: users.avatar,
    rating: users.rating,
  }).from(users).where(eq(users.id, user.id)).then(r => r[0])

  await setUserSession(event, { user: updated })

  return { success: true }
})
