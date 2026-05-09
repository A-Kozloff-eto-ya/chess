import { z } from 'zod'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { sendEmail, getBaseUrl, retrySendEmail, escapeHtml } from '../../utils/email'

const schema = z.object({
  password: z.string().optional(),
  newEmail: z.string().email(),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const user = await db.select({ passwordHash: users.passwordHash, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id))
    .then(r => r[0])

  if (user?.passwordHash) {
    const valid = await verifyPassword(user.passwordHash, parsed.data.password)
    if (!valid) {
      throw createError({ statusCode: 401, statusMessage: 'Password is incorrect' })
    }
  }

  if (parsed.data.newEmail === user.email) {
    throw createError({ statusCode: 400, statusMessage: 'New email is the same as current' })
  }

  const existing = await db.select({ id: users.id }).from(users)
    .where(eq(users.email, parsed.data.newEmail))
    .then(r => r[0])
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Email already in use' })
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await db.update(users).set({
    pendingEmail: parsed.data.newEmail,
    emailChangeToken: token,
    emailChangeExpires: expiresAt,
  }).where(eq(users.id, session.user.id))

  const baseUrl = getBaseUrl()
  const confirmUrl = `${baseUrl}/confirm-email-change?token=${token}`

  try {
    await retrySendEmail(
      parsed.data.newEmail,
      'Confirm Email Change — Chess',
      `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #e2e8f0;">Confirm Email Change</h2>
          <p style="color: #94a3b8;">Hello, ${escapeHtml(session.user.username)}!</p>
          <p style="color: #94a3b8;">You requested to change your email to this address. Click the button below to confirm:</p>
          <a href="${confirmUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">Confirm Email Change</a>
          <p style="color: #64748b; font-size: 13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
          <p style="color: #64748b; font-size: 13px;">Or copy this link: ${confirmUrl}</p>
        </div>
      `,
    )
  } catch {
    await db.update(users).set({
      pendingEmail: null,
      emailChangeToken: null,
      emailChangeExpires: null,
    }).where(eq(users.id, session.user.id))
    throw createError({ statusCode: 500, statusMessage: 'Failed to send confirmation email' })
  }

  return { success: true }
})
