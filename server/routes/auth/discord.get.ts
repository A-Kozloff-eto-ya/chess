import { resolveOAuthUser } from '../../utils/oauth'

export default defineOAuthDiscordEventHandler({
  config: {
    emailRequired: true,
    scope: ['identify', 'email'],
  },
  async onSuccess(event, { user }) {
    const avatarHash = user.avatar
    const avatar = avatarHash
      ? `https://cdn.discordapp.com/avatars/${user.id}/${avatarHash}.png`
      : null
    return resolveOAuthUser(event, {
      provider: 'discord',
      providerId: String(user.id),
      username: user.global_name || user.username || `discord_${user.id}`,
      email: user.email || `${user.username}@discord.com`,
      avatar,
    })
  },
  onError(event, error) {
    console.error('Discord OAuth error:', error)
    return sendRedirect(event, '/')
  },
})
