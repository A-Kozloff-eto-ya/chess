import { z } from 'zod'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const { email, password } = parsed.data

    const user = await db.select().from(users).where(eq(users.email, email)).then(r => r[0])

  if (!user || !user.passwordHash) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  await setUserSession(event, {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      rating: user.rating,
    },
  })

  return { user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, rating: user.rating } }
})
