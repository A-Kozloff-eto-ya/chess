import { resolveOAuthUser } from '../../utils/oauth'

export default defineOAuthYandexEventHandler({
  config: {
    emailRequired: true,
    scope: ['login:avatar', 'login:info'],
  },
  async onSuccess(event, { user: yandexUser }) {
    const username = yandexUser.display_name || yandexUser.login || `yandex_${yandexUser.id}`
    const avatar = !yandexUser.is_avatar_empty && yandexUser.default_avatar_id
      ? `https://avatars.yandex.net/get-yapic/${yandexUser.default_avatar_id}/islands-200`
      : null
    return resolveOAuthUser(event, {
      provider: 'yandex',
      providerId: String(yandexUser.id),
      username,
      email: yandexUser.default_email || `${yandexUser.login}@yandex.ru`,
      avatar,
    })
  },
  onError(event, error) {
    console.error('Yandex OAuth error:', error)
    return sendRedirect(event, '/')
  },
})
