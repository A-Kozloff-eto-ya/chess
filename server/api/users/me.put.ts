import { z } from 'zod'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

const updateSchema = z.object({
  avatar: z.string().nullable().optional(),
  username: z.string().min(2).max(30).optional(),
  bio: z.string().max(200).optional(),
})

const USERNAME_COOLDOWN_MS = 24 * 60 * 60 * 1000

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  if (parsed.data.avatar !== undefined && parsed.data.avatar !== null) {
    const av = parsed.data.avatar
    if (!av.startsWith('/api/users/avatar-serve/avatars/')) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid avatar URL' })
    }
  }

  if (parsed.data.username) {
    const currentUser = await db.select({ id: users.id, username: users.username, usernameChangedAt: users.usernameChangedAt }).from(users)
      .where(eq(users.id, session.user.id))
      .then(r => r[0])

    if (currentUser.usernameChangedAt) {
      const elapsed = Date.now() - new Date(currentUser.usernameChangedAt).getTime()
      if (elapsed < USERNAME_COOLDOWN_MS) {
        const hoursLeft = Math.ceil((USERNAME_COOLDOWN_MS - elapsed) / (60 * 60 * 1000))
        throw createError({ statusCode: 429, statusMessage: `Username can be changed again in ${hoursLeft} hours` })
      }
    }

    const existing = await db.select({ id: users.id }).from(users)
      .where(eq(users.username, parsed.data.username))
      .then(r => r[0])
    if (existing && existing.id !== session.user.id) {
      throw createError({ statusCode: 409, statusMessage: 'Username already taken' })
    }
  }

  const updateData: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.username) {
    updateData.usernameChangedAt = new Date()
  }

  const updated = await db.update(users)
    .set(updateData)
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
