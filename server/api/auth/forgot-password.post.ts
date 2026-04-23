import { z } from 'zod'
import { users, passwordResets } from '../../db/schema'
import { eq, and, gt, isNull } from 'drizzle-orm'
import { sendEmail, getBaseUrl } from '../../utils/email'
import { randomUUID } from 'crypto'

const forgotSchema = z.object({
  email: z.string().email(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = forgotSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  const { email } = parsed.data

  const user = await db.select({
    id: users.id,
    email: users.email,
    username: users.username,
    provider: users.provider,
  }).from(users).where(eq(users.email, email)).then(r => r[0])

  if (!user || user.provider !== 'email') {
    return { success: true }
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await db.insert(passwordResets).values({
    userId: user.id,
    token,
    expiresAt,
  })

  const baseUrl = getBaseUrl()
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  await sendEmail(
    user.email,
    'Password Reset — Chess',
    `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #e2e8f0;">Password Reset</h2>
        <p style="color: #94a3b8;">Hello, ${user.username}!</p>
        <p style="color: #94a3b8;">We received a request to reset your password. Click the button below to set a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
        <p style="color: #64748b; font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #64748b; font-size: 13px;">Or copy this link: ${resetUrl}</p>
      </div>
    `,
  ).catch((e) => {
    console.error('[Forgot Password] Failed to send email:', e.message)
  })

  return { success: true }
})
