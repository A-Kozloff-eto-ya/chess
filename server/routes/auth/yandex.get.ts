import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineOAuthYandexEventHandler({
  config: {
    emailRequired: true,
    scope: ['login:avatar', 'login:info'],
  },
  async onSuccess(event, { user: yandexUser }) {
    console.log('[Yandex OAuth] user data:', JSON.stringify(yandexUser, null, 2))
    let existingUser = await db.select().from(users).where(eq(users.providerId, String(yandexUser.id))).then(r => r[0])

    if (!existingUser) {
      const username = yandexUser.display_name || yandexUser.login || `yandex_${yandexUser.id}`
      existingUser = await db.insert(users).values({
        username,
        email: yandexUser.default_email || `${yandexUser.login}@yandex.ru`,
        avatar: !yandexUser.is_avatar_empty && yandexUser.default_avatar_id
          ? `https://avatars.yandex.net/get-yapic/${yandexUser.default_avatar_id}/islands-200`
          : null,
        provider: 'yandex',
        providerId: String(yandexUser.id),
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
    console.error('Yandex OAuth error:', error)
    return sendRedirect(event, '/')
  },
})
