import nodemailer from 'nodemailer'

const config = useRuntimeConfig()

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter

  const smtp = config.emailSmtp
  if (!smtp.host) {
    throw new Error('SMTP not configured. Set EMAIL_SMTP_HOST and related env vars.')
  }

  transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  })

  return transporter
}

export async function sendEmail(to: string, subject: string, html: string) {
  const from = config.emailSmtp.from || `Chess <noreply@${config.emailSmtp.host}>`
  const transport = getTransporter()
  await transport.sendMail({ from, to, subject, html })
}

export function getBaseUrl() {
  return config.public.appUrl || 'http://localhost:3000'
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function retrySendEmail(to: string, subject: string, html: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await sendEmail(to, subject, html)
      return
    } catch (e) {
      if (i === retries - 1) throw e
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
}
