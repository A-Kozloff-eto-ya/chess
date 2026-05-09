import { users, userOauthAccounts } from '../db/schema'
import { eq, and } from 'drizzle-orm'

interface OAuthProfile {
  provider: string
  providerId: string
  username: string
  email: string
  avatar: string | null
  profileUrl?: string | null
}

export async function resolveOAuthUser(event: any, profile: OAuthProfile) {
  const oauthAccount = await db.select({
    id: userOauthAccounts.id,
    userId: userOauthAccounts.userId,
  }).from(userOauthAccounts).where(
    and(eq(userOauthAccounts.provider, profile.provider), eq(userOauthAccounts.providerId, profile.providerId))
  ).then(r => r[0])

  const session = await getUserSession(event)

  if (oauthAccount) {
    if (session?.user?.id && session.user.id !== oauthAccount.userId) {
      return sendRedirect(event, '/settings?error=already_linked')
    }
    const user = await db.select().from(users).where(eq(users.id, oauthAccount.userId)).then(r => r[0])
    if (user) {
      await setUserSession(event, {
        user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, rating: user.rating },
      })
      return sendRedirect(event, '/')
    }
  }

  if (session?.user?.id) {
    await db.insert(userOauthAccounts).values({
      userId: session.user.id,
      provider: profile.provider,
      providerId: profile.providerId,
      username: profile.username,
      profileUrl: profile.profileUrl || null,
    })
    return sendRedirect(event, '/settings?linked=' + profile.provider)
  }

  const existingByEmail = await db.select({
    id: users.id,
    passwordHash: users.passwordHash,
    provider: users.provider,
  }).from(users).where(eq(users.email, profile.email)).then(r => r[0])

  if (existingByEmail) {
    const baseUrl = useRuntimeConfig().public.appUrl || 'http://localhost:3000'
    return sendRedirect(event, `${baseUrl}/link-account?provider=${profile.provider}&email=${encodeURIComponent(profile.email)}&providerId=${profile.providerId}&username=${encodeURIComponent(profile.username)}&avatar=${encodeURIComponent(profile.avatar || '')}&profileUrl=${encodeURIComponent(profile.profileUrl || '')}`)
  }

  const newUser = await db.insert(users).values({
    username: profile.username,
    email: profile.email,
    avatar: profile.avatar,
    provider: profile.provider,
    providerId: profile.providerId,
  }).returning().then(r => r[0])

  await db.insert(userOauthAccounts).values({
    userId: newUser.id,
    provider: profile.provider,
    providerId: profile.providerId,
    username: profile.username,
    profileUrl: profile.profileUrl || null,
  })

  await setUserSession(event, {
    user: { id: newUser.id, username: newUser.username, email: newUser.email, avatar: newUser.avatar, rating: newUser.rating },
  })

  return sendRedirect(event, '/')
}
