import { userOauthAccounts } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const accounts = await db.select({
    provider: userOauthAccounts.provider,
    username: userOauthAccounts.username,
    profileUrl: userOauthAccounts.profileUrl,
    visible: userOauthAccounts.visible,
  }).from(userOauthAccounts).where(eq(userOauthAccounts.userId, session.user.id))

  return accounts
})
