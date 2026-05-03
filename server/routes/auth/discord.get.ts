import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineOAuthDiscordEventHandler({
  config: {
    emailRequired: true,
    scope: ['identify', 'email'],
  },
  async onSuccess(event, { user }) {
    let existingUser = await db.select().from(users).where(eq(users.providerId, String(user.id))).then(r => r[0])

    if (!existingUser) {
      const avatarHash = user.avatar
      const avatar = avatarHash
        ? `https://cdn.discordapp.com/avatars/${user.id}/${avatarHash}.png`
        : null
      existingUser = await db.insert(users).values({
        username: user.global_name || user.username || `discord_${user.id}`,
        email: user.email || `${user.username}@discord.com`,
        avatar,
        provider: 'discord',
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
    console.error('Discord OAuth error:', error)
    return sendRedirect(event, '/')
  },
})
