import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user }) {
        let existingUser = await db.select().from(users).where(eq(users.providerId, String(user.id))).then(r => r[0])

    if (!existingUser) {
      existingUser = await db.insert(users).values({
        username: user.login,
        email: user.email || `${user.login}@github.com`,
        avatar: user.avatar_url,
        provider: 'github',
        providerId: String(user.id),
      }).returning().then(r => r[0])
    }

    await setUserSession(event, {
      user: {
        id: existingUser.id,
        username: existingUser.username,
        email: existingUser.email,
        avatar: existingUser.avatar,
        rating: existingUser.rating,
      },
    })

    return sendRedirect(event, '/')
  },
  onError(event, error) {
    console.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/')
  },
})
