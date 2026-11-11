/**
 * Access control — single source of truth for "who can see what".
 *
 * Four tiers (low → high). Each tier includes everything below it:
 *
 *   public           ทุกคน (ไม่ต้องล็อกอิน)            — home (/), auth-required, demo, static assets
 *   user             ผู้ใช้ที่ล็อกอินแล้ว                — the whole (private) dashboard
 *   deptAdmin        ผู้ดูแลระดับหน่วยงาน/คณะ            — /admin/**
 *   universityAdmin  ผู้ดูแลระดับมหาวิทยาลัย             — /admin/university/**
 *
 * There is no login page: sign-in is ERP OAuth only, started from the profile menu.
 * A non-public route visited without a session is answered by middleware with a 401 rewrite
 * to /auth-required (no redirect). A demo token counts as public unless DEMO_MODE is on.
 *
 * Routes are matched WITHOUT the basePath (Next.js strips it inside middleware).
 * Paths follow the project convention: keep them shallow (≤ 3 segments) and put all
 * admin pages under /admin (university-wide pages under /admin/university).
 *
 * Used by: src/middleware.ts (enforcement) and the sidebar menu/role toggle (visibility).
 */

import { DEMO_MODE, isDemoToken } from '@/libs/demo'

export type AccessLevel = 'public' | 'user' | 'deptAdmin' | 'universityAdmin'

// Roles a signed-in account can hold / view as (everything except 'public').
export type AppRole = Exclude<AccessLevel, 'public'>

export const accessLevelRank: Record<AccessLevel, number> = {
  public: 0,
  user: 1,
  deptAdmin: 2,
  universityAdmin: 3
}

/**
 * Routes anyone can view WITHOUT logging in (besides the auth API + static assets).
 * Add dashboard/table paths here to expose them publicly. Keep them shallow (≤ 3 segments).
 * (These pages still render the dashboard layout — only the auth check is skipped.)
 */
export const publicRoutes: string[] = [
  '/', // public home (exact match only — see requiredLevelFor)
  '/auth-required', // shown in place of a protected page to anonymous visitors (401)
  '/demo', // role simulator page (only functional when DEMO_MODE is on)
  '/dashboards/analytics', // example: a public-facing dashboard
  '/users', // example: a public table
  '/api/log', // client-side error reporting endpoint
  '/api/demo', // demo session endpoints (404 unless DEMO_MODE is on)

  // Self-authenticating APIs (session cookie or OAuth bearer) — they answer 401 JSON themselves.
  // See src/mcp/auth.ts.
  '/api/mcp',
  '/api/oauth',
  '/api/chat',
  '/api/actions',
  '/api/files',

  // Pages that check the session themselves and start the ERP sign-in with a return URL.
  '/oauth',
  '/actions'
]

// Route → minimum level. Ordered MOST-SPECIFIC FIRST; the first matching prefix wins.
export const routeAccessRules: { prefix: string; level: AccessLevel }[] = [
  ...publicRoutes.map(prefix => ({ prefix, level: 'public' as AccessLevel })),
  { prefix: '/admin/university', level: 'universityAdmin' },
  { prefix: '/admin', level: 'deptAdmin' }
]

// Everything not listed above (the authenticated dashboard) needs at least login.
export const defaultAccessLevel: AccessLevel = 'user'

const higher = (a: AccessLevel, b: AccessLevel): AccessLevel => (accessLevelRank[a] >= accessLevelRank[b] ? a : b)

/** Level of one already-normalised path: first matching rule wins, otherwise the default. */
const levelOfPath = (path: string): AccessLevel => {
  const rule = routeAccessRules.find(r => {
    // The root rule matches the root path ONLY — every other path would otherwise start with '/'.
    if (r.prefix === '/') {
      return path === '/'
    }

    return path === r.prefix || path.startsWith(`${r.prefix}/`)
  })

  return rule ? rule.level : defaultAccessLevel
}

/**
 * Minimum access level required to view a path (without basePath).
 *
 * The router matches the still-ENCODED path, while an attacker may hope for a decoded reading, so the
 * result is the STRICTER of:
 *   (a) the raw path (repeated slashes collapsed, trailing slash dropped — trailingSlash: true in next.config);
 *   (b) the path with every segment percent-decoded and dot segments resolved ('/%61dmin' -> '/admin',
 *       '/users/../admin' -> '/admin').
 * Fail closed: a malformed escape, or a decoded segment that holds '/' or '\' or is '.'/'..', makes the
 * path at least 'user' (never lower than its raw level).
 */
export const requiredLevelFor = (pathname: string): AccessLevel => {
  const rawSegments = pathname.split('/').filter(segment => segment !== '')
  let level = levelOfPath(`/${rawSegments.join('/')}`)

  const decoded: string[] = []
  let suspicious = false

  for (const segment of rawSegments) {
    let value: string

    try {
      value = decodeURIComponent(segment)
    } catch {
      return higher(level, defaultAccessLevel)
    }

    if (value.includes('/') || value.includes('\\') || value === '.' || value === '..') suspicious = true

    decoded.push(value)
  }

  // Resolve dot segments over everything decoded, including slashes that came from %2F.
  const resolved: string[] = []

  for (const segment of decoded.join('/').split('/')) {
    if (segment === '..') resolved.pop()
    else if (segment !== '' && segment !== '.') resolved.push(segment)
  }

  level = higher(level, levelOfPath(`/${resolved.join('/')}`))

  return suspicious ? higher(level, defaultAccessLevel) : level
}

/** True if a path is viewable without logging in. */
export const isPublicRoute = (pathname: string): boolean => requiredLevelFor(pathname) === 'public'

/**
 * Resolve a signed-in user's level from their auth token.
 *
 * A demo token (role simulator, see src/libs/demo.ts) is worth nothing when DEMO_MODE is off and
 * resolves to 'public'. Real ERP tokens get their role from the `jwt` callback (src/libs/ErpAuth.ts,
 * resolved by src/libs/roleResolver.ts).
 */
export const resolveUserLevel = (token: Record<string, any> | null): AccessLevel => {
  if (!token) {
    return 'public'
  }

  if (isDemoToken(token) && !DEMO_MODE) {
    return 'public'
  }

  const role = token.role ?? token.user?.role

  if (role === 'universityAdmin' || role === 'deptAdmin' || role === 'user') {
    return role
  }

  // Authenticated but no admin claim → regular user.
  return 'user'
}
