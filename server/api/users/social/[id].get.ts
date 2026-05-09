import { userOauthAccounts } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const userId = Number(getRouterParam(event, 'id'))
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user id' })
  }

  const accounts = await db.select({
    provider: userOauthAccounts.provider,
    username: userOauthAccounts.username,
    profileUrl: userOauthAccounts.profileUrl,
  }).from(userOauthAccounts).where(
    and(eq(userOauthAccounts.userId, userId), eq(userOauthAccounts.visible, true))
  )

  return accounts
})
