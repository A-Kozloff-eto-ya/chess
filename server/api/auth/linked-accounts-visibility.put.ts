import { z } from 'zod'
import { userOauthAccounts } from '../../db/schema'
import { eq, and } from 'drizzle-orm'

const schema = z.object({
  provider: z.string(),
  visible: z.boolean(),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  await db.update(userOauthAccounts)
    .set({ visible: parsed.data.visible })
    .where(and(eq(userOauthAccounts.userId, session.user.id), eq(userOauthAccounts.provider, parsed.data.provider)))

  return { success: true }
})
