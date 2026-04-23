import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const [fresh] = await db.select({
    id: users.id,
    username: users.username,
    email: users.email,
    avatar: users.avatar,
    bio: users.bio,
    rating: users.rating,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, session.user.id))

  if (fresh) {
    await setUserSession(event, { user: fresh })
    return fresh
  }

  return session.user
})
