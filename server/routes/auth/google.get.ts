import { resolveOAuthUser } from '../../utils/oauth'

export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {
    return resolveOAuthUser(event, {
      provider: 'google',
      providerId: String(user.sub),
      username: user.name || user.email?.split('@')[0] || 'user',
      email: user.email || '',
      avatar: user.picture || null,
    })
  },
  onError(event, error) {
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/')
  },
})
