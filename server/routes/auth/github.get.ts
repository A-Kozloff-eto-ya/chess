import { resolveOAuthUser } from '../../utils/oauth'

export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user }) {
    return resolveOAuthUser(event, {
      provider: 'github',
      providerId: String(user.id),
      username: user.login,
      email: user.email || `${user.login}@github.com`,
      avatar: user.avatar_url,
      profileUrl: `https://github.com/${user.login}`,
    })
  },
  onError(event, error) {
    console.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/')
  },
})
