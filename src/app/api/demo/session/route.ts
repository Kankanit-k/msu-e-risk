// Node Imports
import { randomUUID } from 'node:crypto'

// Next Imports
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Auth Imports
import { encode } from 'next-auth/jwt'

// Config Imports
import { roles, personaFullName } from '@/configs/roles'
import type { RoleDefinition } from '@/configs/roles'
import type { AppRole } from '@/configs/accessControl'

// Lib Imports
import { DEMO_MODE } from '@/libs/demo'
import { withLogging } from '@/libs/logger/withLogging'
import { isSameOrigin } from '@/mcp/auth'

// encode() and crypto need the Node runtime.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SESSION_MAX_AGE = 60 * 60 * 8
const COOKIE_PLAIN = 'next-auth.session-token'
const COOKIE_SECURE = '__Secure-next-auth.session-token'

const notFound = () => NextResponse.json({ ok: false, error: 'Not Found' }, { status: 404 })

// Decided from the configured public URL, not from request headers (those can be spoofed or stripped by a proxy).
const isSecure = () => process.env.NEXTAUTH_URL?.startsWith('https://') === true

const forbidden = (error: string) => NextResponse.json({ ok: false, error }, { status: 403 })

// Clears both cookie names (the name depends on the scheme) and any chunks (name.0 ... name.3)
// that NextAuth may have written when the token grew past the cookie size limit.
const clearSessionCookies = (res: NextResponse) => {
  for (const [name, secure] of [
    [COOKIE_PLAIN, false],
    [COOKIE_SECURE, true]
  ] as const) {
    for (const suffix of ['', '.0', '.1', '.2', '.3']) {
      res.cookies.set({ name: `${name}${suffix}`, value: '', httpOnly: true, sameSite: 'lax', path: '/', secure, maxAge: 0 })
    }
  }
}

// Token shape mirrors what ErpAuth stores for a real sign-in, plus the demo flag.
const buildDemoToken = (role: RoleDefinition, appRole: AppRole) => {
  const { persona } = role

  // Random per-session suffix (keeps the 'DEMO-' prefix): visitors never share an identity, so data
  // they create (files, grants, audit rows) is not mixed across browsers.
  const staffId = `${persona.staffId}-${randomUUID().slice(0, 8)}`

  return {
    sub: staffId,
    role: appRole,
    demo: true,
    user: {
      id: staffId,
      STAFFID: staffId,
      name: personaFullName(persona),
      STAFFNAME: persona.staffName,
      STAFFSURNAME: persona.staffSurname,
      STAFFEMAIL1: persona.email,
      POSITIONNAME: persona.position,
      SCOPES: { groupname: persona.unit, staffdepartmentname: persona.unit },
      role: appRole
    }
  }
}

const postHandler = withLogging(async (req, { log }) => {
  if (!DEMO_MODE) return notFound()

  // CSRF guard on top of SameSite=Lax, and no form-encoded cross-site posts.
  if (!isSameOrigin(req)) return forbidden('Bad origin')

  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return forbidden('Content-Type must be application/json')
  }

  const body = (await req.json().catch(() => null)) as { personaId?: unknown } | null
  const personaId = typeof body?.personaId === 'string' ? body.personaId : ''
  const role = roles.find(r => r.id === personaId)

  if (!role) {
    return NextResponse.json({ ok: false, error: 'Unknown persona' }, { status: 400 })
  }

  if (role.id === 'guest') {
    const res = NextResponse.json({ ok: true, personaId: 'guest' })

    clearSessionCookies(res)
    log.info('Demo session cleared', { context: { personaId: 'guest' } })

    return res
  }

  const secret = process.env.NEXTAUTH_SECRET

  if (!secret) {
    log.error('NEXTAUTH_SECRET is not set; cannot mint a demo session')

    return NextResponse.json({ ok: false, error: 'NEXTAUTH_SECRET is not configured' }, { status: 500 })
  }

  // Narrowed by the guest check above: every other catalog entry is a signed-in role.
  const appRole = role.id as AppRole
  const value = await encode({ token: buildDemoToken(role, appRole), secret, maxAge: SESSION_MAX_AGE })
  const secure = isSecure()
  const res = NextResponse.json({ ok: true, personaId: role.id, role: appRole })

  res.cookies.set({
    name: secure ? COOKIE_SECURE : COOKIE_PLAIN,
    value,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: SESSION_MAX_AGE
  })

  log.info('Demo session started', { context: { personaId: role.id, role: appRole } })

  return res
})

const deleteHandler = withLogging(async (req, { log }) => {
  if (!DEMO_MODE) return notFound()

  if (!isSameOrigin(req)) return forbidden('Bad origin')

  const res = NextResponse.json({ ok: true })

  clearSessionCookies(res)
  log.info('Demo session cleared')

  return res
})

export const POST = (req: NextRequest) => postHandler(req, {})
export const DELETE = (req: NextRequest) => deleteHandler(req, {})
