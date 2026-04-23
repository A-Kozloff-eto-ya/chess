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
