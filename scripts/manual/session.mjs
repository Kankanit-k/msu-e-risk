// Shared helpers for the manual scripts: target URL, a logged-in demo session, and the help data.
// The session is minted with NEXTAUTH_SECRET (no ERP round trip), for a DEMO user — never capture
// real people's data into a manual (PDPA).
import { encode } from 'next-auth/jwt'
import { chromium } from 'playwright'

export { helpByPage, manualSlug } from '../../src/data/help/index.ts'

// node --env-file does not expand ${VAR} references the way Next.js does — do it here.
const env = key => (process.env[key] ?? '').replace(/\$\{(\w+)\}/g, (_, name) => env(name))
const basePath = env('NEXT_PUBLIC_BASEPATH').startsWith('/') ? env('NEXT_PUBLIC_BASEPATH') : ''

export const BASE = (process.env.MANUAL_BASE_URL || `http://localhost:3000${basePath}`).replace(/\/+$/, '')

export const DEMO_USER = {
  id: 'demo',
  STAFFID: 'demo',
  name: 'ผู้ใช้ ตัวอย่าง',
  STAFFNAME: 'ผู้ใช้',
  STAFFSURNAME: 'ตัวอย่าง',
  email: 'demo@msu.ac.th',
  STAFFEMAIL1: 'demo@msu.ac.th'
}

export const openBrowser = async ({ video } = {}) => {
  if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET is not set — run with node --env-file=.env.local')

  const url = new URL(BASE)
  const secure = url.protocol === 'https:'
  const token = await encode({ secret: process.env.NEXTAUTH_SECRET, token: { sub: DEMO_USER.id, role: 'user', user: DEMO_USER } })

  const browser = await chromium.launch()
  const size = { width: 1440, height: 900 }

  const context = await browser.newContext({
    viewport: size,
    colorScheme: 'light',
    locale: 'th-TH',
    ...(video && { recordVideo: { dir: video, size } })
  })

  await context.addCookies([
    {
      name: `${secure ? '__Secure-' : ''}next-auth.session-token`,
      value: token,
      domain: url.hostname,
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'Lax'
    }
  ])

  // Fail fast (and before touching any output) if the server rejects the minted session.
  const session = await (await context.request.get(`${BASE}/api/auth/session/`)).json().catch(() => ({}))

  if (!session?.user) {
    await browser.close()
    throw new Error(`login failed: ${BASE} rejected the demo session — NEXTAUTH_SECRET must match the running server`)
  }

  // Pretend every tour was already seen so none auto-starts; the scripts start it via the button.
  await context.addInitScript(() => {
    // Hide the Next.js dev-mode indicator so it never lands in a screenshot or video.
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style')

      style.textContent = 'nextjs-portal { display: none !important; }'
      document.head.append(style)
    })

    const get = Storage.prototype.getItem

    Storage.prototype.getItem = function (key) {
      return String(key).includes('-tour-seen:') ? '1' : get.call(this, key)
    }
  })

  return { browser, context }
}

/** Open a page and fail loudly if the session was rejected (redirected to login/ERP). */
export const gotoPage = async (page, route) => {
  const target = `${BASE}${route === '/' ? '' : route}/`

  const res = await page.goto(target, { waitUntil: 'networkidle' })

  if (!page.url().startsWith(BASE) || /\/login\/?$/.test(new URL(page.url()).pathname))
    throw new Error(`login failed: ${target} ended at ${page.url()} — NEXTAUTH_SECRET must match the running server`)

  if (!res?.ok()) throw new Error(`${target} answered ${res?.status()} — is the server running with this basePath? (set MANUAL_BASE_URL)`)
}

/** Start the tour and yield once per visible step with the step's index in helpByPage. */
export async function* tourSteps(page) {
  await page.click('[data-tour="tour"]')

  for (;;) {
    const card = page.locator('[data-tour-card]')

    await card.waitFor()
    const n = Number(await card.getAttribute('data-help-index'))
    const step = Number(await card.getAttribute('data-tour-step'))

    await page.waitForTimeout(350) // let the spotlight and popper settle
    yield n

    // Interactive steps have no "next" button — do what the step asks instead.
    const waitFor = await card.getAttribute('data-wait-for')
    const target = await card.getAttribute('data-tour-target')
    const isLast = step + 1 === Number(await card.getAttribute('data-tour-total'))

    if (waitFor === 'click') await page.click(target)
    else if (waitFor === 'input') await page.fill(target, 'ตัวอย่าง').then(() => page.press(target, 'Tab'))
    else await page.click('[data-tour-next]')
    if (isLast) break
    await page.waitForSelector(`[data-tour-card][data-tour-step="${step + 1}"]`)
  }
}
