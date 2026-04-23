import { z } from 'zod'
import { users } from '../../db/schema'
import { eq, or } from 'drizzle-orm'

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const { username, email, password } = parsed.data

    const existing = await db.select().from(users).where(
    or(eq(users.email, email), eq(users.username, username))
  ).then(r => r[0])

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'User with this email or username already exists' })
  }

  const passwordHash = await hashPassword(password)

  const newUser = await db.insert(users).values({
    username,
    email,
    passwordHash,
    provider: 'email',
  }).returning().then(r => r[0])

  await setUserSession(event, {
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      avatar: newUser.avatar,
      rating: newUser.rating,
    },
  })

  return { user: newUser }
})
