import { eq } from 'drizzle-orm'
import { users, emailVerifications } from '../../db/schema'
import { randomBytes } from 'crypto'
import { sendEmail, getBaseUrl, retrySendEmail, escapeHtml } from '../../utils/email'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id

  const user = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0])
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (user.emailVerified === 'true') throw createError({ statusCode: 400, statusMessage: 'Email already verified' })

  await db.delete(emailVerifications).where(eq(emailVerifications.userId, userId))

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await db.insert(emailVerifications).values({
    userId,
    token,
    expiresAt,
  })

  const baseUrl = getBaseUrl()
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`
  const subject = 'Verify your email'
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Chess — Email Verification</h2>
      <p>Hello ${escapeHtml(user.username)},</p>
      <p>Please verify your email address by clicking the button below:</p>
      <a href="${verifyUrl}" style="display: inline-block; background: #f59e0b; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">Verify Email</a>
      <p style="color: #888; font-size: 13px;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
    </div>
  `

  try {
    await retrySendEmail(user.email, subject, html)
  } catch {
    await db.delete(emailVerifications).where(eq(emailVerifications.token, token))
    throw createError({ statusCode: 500, statusMessage: 'Failed to send verification email' })
  }

  return { success: true }
})
