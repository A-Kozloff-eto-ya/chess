import { z } from 'zod'
import { users, userOauthAccounts } from '../../db/schema'
import { eq } from 'drizzle-orm'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  provider: z.string(),
  providerId: z.string(),
  username: z.string().optional(),
  avatar: z.string().optional(),
  profileUrl: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const { email, password, provider, providerId, username, avatar, profileUrl } = parsed.data

  const user = await db.select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .then(r => r[0])

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  if (!user.passwordHash) {
    throw createError({ statusCode: 400, statusMessage: 'No password set. Log in with your existing provider first.' })
  }

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Incorrect password' })
  }

  await db.insert(userOauthAccounts).values({
    userId: user.id,
    provider,
    providerId,
    username: username || null,
    profileUrl: profileUrl || null,
  }).onConflictDoNothing()

  await setUserSession(event, {
    user: await db.select({
      id: users.id, username: users.username, email: users.email, avatar: users.avatar, rating: users.rating,
    }).from(users).where(eq(users.id, user.id)).then(r => r[0]),
  })

  return { success: true }
})
