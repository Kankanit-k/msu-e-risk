// Resolve who is calling. Two ways in:
//   - session cookie (the in-app chat and the confirm pages) → sessionCaller()
//   - OAuth bearer token (external MCP clients on /api/mcp)  → bearerCaller()
import 'server-only'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/libs/ErpAuth'
import { resolveUserLevel } from '@/configs/accessControl'
import type { AppRole } from '@/configs/accessControl'
import { DEMO_MODE } from '@/libs/demo'

import { getStore } from './store'
import { TTL, sha256 } from './config'
import { ALL_SCOPES } from './types'
import type { Caller } from './types'

// Local-dev escape hatch, same switch as middleware. Never honoured in production.
const devBypass = () => process.env.AUTH_DISABLED === 'true' && process.env.NODE_ENV !== 'production'

const DEV_USER = { userId: 'dev', name: 'ผู้ใช้ทดสอบ (dev)', email: 'dev@localhost', role: 'user' as AppRole }

export const sessionCaller = async (): Promise<Caller | null> => {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (user?.id || user?.STAFFID) {
    // session.demo / session.role come from the jwt + session callbacks (src/libs/ErpAuth.ts).
    const role = resolveUserLevel(session as unknown as Record<string, any>)
    const demo = (session as unknown as { demo?: boolean }).demo === true

    // No usable role (e.g. a demo session while demo mode is off) → not signed in.
    if (role === 'public') return null

    return {
      userId: String(user.STAFFID ?? user.id),
      name: user.name ?? `${user.STAFFNAME ?? ''} ${user.STAFFSURNAME ?? ''}`.trim(),
      email: user.email ?? undefined,
      role,
      demo,
      clientId: 'in-app',
      scopes: ALL_SCOPES
    }
  }

  return devBypass() ? { ...DEV_USER, clientId: 'in-app', scopes: ALL_SCOPES } : null
}

export const bearerCaller = async (req: Request): Promise<Caller | null> => {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '')

  if (!match) return null

  const hash = sha256(match[1])
  const data = await getStore().read()
  const token = data.accessTokens.find(t => t.hash === hash)

  if (!token || Date.parse(token.expiresAt) <= Date.now()) return null

  const grant = data.grants.find(g => g.id === token.grantId)

  if (!grant || grant.revokedAt || Date.parse(grant.createdAt) + TTL.grantMax <= Date.now()) return null

  // Defence in depth: grants are never issued to demo sessions (oauth/authorize), and a leftover
  // demo grant is dead once demo mode is off.
  if (!DEMO_MODE && grant.user.userId.startsWith('DEMO-')) return null

  return { ...grant.user, clientId: grant.clientId, scopes: grant.scopes }
}

/** Same-origin check for cookie-authenticated POSTs (CSRF guard on top of SameSite=Lax). */
export const isSameOrigin = (req: Request) => {
  const origin = req.headers.get('origin')

  if (!origin) return false

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')

  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
