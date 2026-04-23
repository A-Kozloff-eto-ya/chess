import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {
        let existingUser = await db.select().from(users).where(eq(users.providerId, String(user.sub))).then(r => r[0])

    if (!existingUser) {
      existingUser = await db.insert(users).values({
        username: user.name || user.email?.split('@')[0] || 'user',
        email: user.email || '',
        avatar: user.picture || null,
        provider: 'google',
        providerId: String(user.sub),
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
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/')
  },
})
