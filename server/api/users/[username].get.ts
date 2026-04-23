import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username')

  if (!username) {
    throw createError({ statusCode: 400, statusMessage: 'Username is required' })
  }

  const user = await db.select({
    id: users.id,
    username: users.username,
    avatar: users.avatar,
    bio: users.bio,
    rating: users.rating,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.username, username)).then(r => r[0])

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return user
})
