import { z } from 'zod'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

const updateSchema = z.object({
  avatar: z.string().optional(),
  username: z.string().min(2).max(30).optional(),
  bio: z.string().max(200).optional(),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

    const updated = await db.update(users)
    .set(parsed.data)
    .where(eq(users.id, session.user.id))
    .returning()
    .then(r => r[0])

  await setUserSession(event, {
    user: {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      avatar: updated.avatar,
      rating: updated.rating,
    },
  })

  return updated
})
