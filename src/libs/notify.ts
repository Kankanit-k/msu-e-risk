// Notifications — LINE Messaging API push and/or email over SMTP. Each channel is a silent no-op
// until its env vars are set (see .env.example), so the template works with nothing configured.
// Failures are logged, never thrown: a notification must not break the action that triggered it.
//
//   LINE:  LINE_CHANNEL_ACCESS_TOKEN + LINE_NOTIFY_TO (user/group id; comma-separated for several)
//   Email: SMTP_HOST + SMTP_FROM + NOTIFY_EMAIL_TO (+ SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE)
//          Needs `pnpm add nodemailer` — loaded lazily, so it is optional until you set SMTP_HOST.
import 'server-only'

import { logger } from '@/libs/logger'

export type Notice = {
  subject: string
  text: string

  /** Override the default recipients from env. */
  lineTo?: string[]
  emailTo?: string[]
}

const list = (v?: string) =>
  (v ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

const pushLine = async ({ subject, text, lineTo }: Notice) => {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const to = lineTo ?? list(process.env.LINE_NOTIFY_TO)

  if (!token || !to.length) return

  for (const recipient of to) {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to: recipient, messages: [{ type: 'text', text: `${subject}\n${text}`.slice(0, 5000) }] }),
      signal: AbortSignal.timeout(10_000)
    })

    if (!res.ok) throw new Error(`LINE push ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
}

const sendEmail = async ({ subject, text, emailTo }: Notice) => {
  const host = process.env.SMTP_HOST
  const from = process.env.SMTP_FROM
  const to = emailTo ?? list(process.env.NOTIFY_EMAIL_TO)

  if (!host || !from || !to.length) return

  // Variable specifier keeps the bundler from requiring nodemailer when email is not used.
  const mod = 'nodemailer'

  const nodemailer = (await import(/* webpackIgnore: true */ mod)) as {
    createTransport: (o: unknown) => { sendMail: (m: unknown) => Promise<unknown> }
  }

  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  })

  await transport.sendMail({ from, to: to.join(','), subject, text })
}

export const notify = async (notice: Notice) => {
  const results = await Promise.allSettled([pushLine(notice), sendEmail(notice)])

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      logger.error('notification failed', {
        error: r.reason,
        context: { channel: i === 0 ? 'line' : 'email', subject: notice.subject }
      })
    }
  })
}
