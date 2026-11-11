// Smoke tests: public home, anonymous access rules, the no-auto-redirect guard, the demo role
// simulator and the signed-in pages. See playwright.config.ts.
import { expect, test } from '@playwright/test'
import type { APIRequestContext, APIResponse } from '@playwright/test'
import { encode } from 'next-auth/jwt'

import themeConfig from '../src/configs/themeConfig'

const BASE = process.env.SMOKE_BASEPATH ?? ''

const ERP_HOST = 'erp.msu.ac.th'
const SIGN_IN_LABEL = /เข้าสู่ระบบด้วย ERP/
const GUARD_WAIT_MS = 3000
const GUARD_PATHS = ['/', '/home/', '/dashboards/crm/', '/admin/users/']

// A demo session minted the same way scripts/manual/session.mjs does (no ERP round trip).
const DEMO_USER = { id: 'demo', STAFFID: 'demo', name: 'ผู้ใช้ ตัวอย่าง', email: 'demo@msu.ac.th' }

const pathnameOf = (url: string) => new URL(url).pathname

// Redirect target of a response, resolved against the request URL, as a pathname.
const redirectPathOf = (res: APIResponse) => new URL(res.headers()['location'] ?? '', res.url()).pathname

// The demo endpoints only accept same-origin requests; APIRequestContext sends no Origin by itself.
const ORIGIN = process.env.SMOKE_BASE_URL?.replace(/\/+$/, '') || `http://localhost:${Number(process.env.SMOKE_PORT || 3103)}`

const startDemoSession = (request: APIRequestContext, personaId: string) =>
  request.post(`${BASE}/api/demo/session`, { data: { personaId }, headers: { Origin: ORIGIN } })

// Redirects are not followed, so the status and the target are checked as they are.
const getNoFollow = (request: APIRequestContext, path: string) =>
  request.get(`${BASE}${path}`, { maxRedirects: 0 })

test.describe('anonymous', () => {
  test('public home renders without a redirect', async ({ page }) => {
    const res = await page.goto(`${BASE}/`)

    expect(res?.status()).toBe(200)
    expect(pathnameOf(page.url())).toBe(`${BASE}/`)
    await expect(page).toHaveTitle(new RegExp(themeConfig.templateName))
    await expect(page.locator('body')).toContainText(themeConfig.templateSubtitle ?? themeConfig.templateName)
  })

  test('private page answers 401 with a sign-in hint and no sign-in button in main', async ({ page }) => {
    const res = await page.goto(`${BASE}/home/`)

    expect(res?.status()).toBe(401)
    expect(pathnameOf(page.url())).toBe(`${BASE}/home/`)
    await expect(page.locator('body')).toContainText('ต้องเข้าสู่ระบบ')

    const main = page.getByRole('main')

    await expect(main).toBeVisible()
    await expect(main.getByRole('button', { name: SIGN_IN_LABEL })).toHaveCount(0)
    await expect(main.getByRole('link', { name: SIGN_IN_LABEL })).toHaveCount(0)
  })

  test('opening pages never redirects to a login page or ERP', async ({ page }) => {
    const requestedUrls: string[] = []

    page.on('request', req => requestedUrls.push(req.url()))

    for (const path of GUARD_PATHS) {
      await page.goto(`${BASE}${path}`)
      await page.waitForTimeout(GUARD_WAIT_MS)

      expect(page.url()).not.toContain(ERP_HOST)
      expect(pathnameOf(page.url())).not.toContain('login')
    }

    expect(requestedUrls.filter(url => url.includes(ERP_HOST))).toEqual([])
    expect(requestedUrls.filter(url => url.includes('/api/auth/signin'))).toEqual([])
  })

  test('/login redirects to the home page', async ({ page }) => {
    await page.goto(`${BASE}/login/`)

    expect(pathnameOf(page.url())).toBe(`${BASE}/`)
  })

  test('profile avatar offers the ERP sign-in entry', async ({ page }) => {
    await page.goto(`${BASE}/`)

    await page.locator("[data-tour='profile']").click()

    await expect(page.getByRole('button', { name: 'เข้าสู่ระบบด้วย ERP มมส' })).toBeVisible()
  })

  test('/api/manual rejects requests without a session', async ({ request }) => {
    const res = await request.get(`${BASE}/api/manual/manual.pdf`)

    expect(res.status()).toBe(401)
  })

  test('public dashboards open without a session', async ({ page }) => {
    for (const path of ['/dashboards/analytics/', '/users/']) {
      const res = await page.goto(`${BASE}${path}`)

      expect(res?.status()).toBe(200)
      expect(pathnameOf(page.url())).toBe(`${BASE}${path}`)
    }
  })
})

test.describe('demo role simulator', () => {
  test('deptAdmin opens /admin/users/ but not /admin/university/units/', async ({ context }) => {
    const { request } = context

    expect((await startDemoSession(request, 'deptAdmin')).ok()).toBeTruthy()

    const users = await getNoFollow(request, '/admin/users/')

    expect(users.status()).toBe(200)

    const units = await getNoFollow(request, '/admin/university/units/')

    expect([307, 308]).toContain(units.status())
    expect(redirectPathOf(units)).toBe(`${BASE}/`)
  })

  test('universityAdmin opens /admin/users/ and /admin/university/units/', async ({ context }) => {
    const { request } = context

    expect((await startDemoSession(request, 'universityAdmin')).ok()).toBeTruthy()

    expect((await getNoFollow(request, '/admin/users/')).status()).toBe(200)
    expect((await getNoFollow(request, '/admin/university/units/')).status()).toBe(200)
  })

  test('user is redirected from /admin/users/ to the home page', async ({ context }) => {
    const { request } = context

    expect((await startDemoSession(request, 'user')).ok()).toBeTruthy()

    const res = await getNoFollow(request, '/admin/users/')

    expect([307, 308]).toContain(res.status())
    expect(redirectPathOf(res)).toBe(`${BASE}/`)
  })

  test('unknown persona is rejected with 400', async ({ context }) => {
    const res = await startDemoSession(context.request, 'unknownPersona')

    expect(res.status()).toBe(400)
  })

  test('demo session endpoints reject cross-origin and non-JSON requests', async ({ context }) => {
    const { request } = context

    const crossOrigin = await request.post(`${BASE}/api/demo/session`, {
      data: { personaId: 'user' },
      headers: { Origin: 'https://evil.example' }
    })

    expect(crossOrigin.status()).toBe(403)

    const form = await request.post(`${BASE}/api/demo/session`, {
      form: { personaId: 'user' },
      headers: { Origin: ORIGIN }
    })

    expect(form.status()).toBe(403)
    expect((await getNoFollow(request, '/home/')).status()).toBe(401)
  })

  test('percent-encoded admin paths give no extra access', async ({ context, browser }) => {
    const anonymous = await browser.newContext()
    const anon = await getNoFollow(anonymous.request, '/%61dmin/users/')

    expect(anon.status()).toBe(401)
    await anonymous.close()

    const { request } = context

    expect((await startDemoSession(request, 'user')).ok()).toBeTruthy()

    const plain = await getNoFollow(request, '/%61dmin/users/')

    expect(plain.status()).not.toBe(200)
  })

  test('encoded-slash path tricks are never served', async ({ browser }) => {
    const anonymous = await browser.newContext()

    for (const path of [
      '/api/manual/x%2F..%2F..%2F..%2Fapi%2Flog',
      '/api/requests/x%2F..%2F..%2Flog',
      '/admin/x%2F..%2F..%2Fusers/'
    ]) {
      const res = await getNoFollow(anonymous.request, path)

      // 401: middleware or the route's own session check. 404: no such route. 405: the route has no GET.
      // The matcher skips every path that contains a dot (like these), so the route itself must refuse.
      // The catch-all page answers an unknown path with the "Page Not Found" view and status 200: that is
      // fine, but nothing else may be served with 200.
      if (res.status() === 200) {
        expect(await res.text(), path).toContain('Page Not Found')
      } else {
        expect([401, 404, 405], path).toContain(res.status())
      }
    }

    await anonymous.close()
  })

  test('DELETE clears the demo session', async ({ context }) => {
    const { request } = context

    expect((await startDemoSession(request, 'universityAdmin')).ok()).toBeTruthy()
    expect((await request.delete(`${BASE}/api/demo/session`, { headers: { Origin: ORIGIN } })).ok()).toBeTruthy()

    expect((await getNoFollow(request, '/home/')).status()).toBe(401)
  })
})

test.describe('signed in', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    const secret = process.env.NEXTAUTH_SECRET

    if (!secret) throw new Error('NEXTAUTH_SECRET is not set (CI env or .env.local)')

    const token = await encode({ secret, token: { sub: DEMO_USER.id, role: 'user', user: DEMO_USER } })

    await context.addCookies([
      { name: 'next-auth.session-token', value: token, url: baseURL!, httpOnly: true, sameSite: 'Lax' }
    ])
  })

  for (const route of ['/home/', '/manual/']) {
    test(`opens ${route}`, async ({ page }) => {
      const res = await page.goto(`${BASE}${route}`)

      expect(res?.status()).toBe(200)
      expect(new URL(page.url()).pathname).toBe(`${BASE}${route}`)
    })
  }
})
