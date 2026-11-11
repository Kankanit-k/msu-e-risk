// Next Imports
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Third-party Imports
import { getToken } from 'next-auth/jwt'

// Config Imports
import { accessLevelRank, requiredLevelFor, resolveUserLevel } from '@/configs/accessControl'
import themeConfig from '@configs/themeConfig'

// Local-dev escape hatch — set AUTH_DISABLED=true in .env.local to browse without logging in.
// MUST be unset/false in production.
const AUTH_DISABLED = process.env.AUTH_DISABLED === 'true'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const required = requiredLevelFor(pathname)

  // Public routes (and the dev bypass) skip all checks.
  if (required === 'public' || AUTH_DISABLED) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const level = resolveUserLevel(token)

  // Not signed in (or only a demo token while demo mode is off) → no redirect, no login page.
  // Rewrite the protected URL to /auth-required with status 401; the address bar keeps the original path.
  if (level === 'public') {
    // API callers get JSON, not the HTML notice page.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'login_required' }, { status: 401 })
    }

    const authRequiredUrl = req.nextUrl.clone()

    authRequiredUrl.pathname = '/auth-required'
    authRequiredUrl.search = ''

    return NextResponse.rewrite(authRequiredUrl, { status: 401 })
  }

  // Signed in but not allowed here → bounce to the home page.
  if (accessLevelRank[level] < accessLevelRank[required]) {
    const homeUrl = req.nextUrl.clone()

    homeUrl.pathname = themeConfig.homePageUrl
    homeUrl.search = ''

    return NextResponse.redirect(homeUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Run on everything except the auth API, Next internals, and static files.
  // '/' is listed on its own: with basePath + trailingSlash the catch-all pattern alone does not
  // match the root, and Next then answers "/" with an empty 200 page (found in the smoke run).
  matcher: ['/', '/((?!api/auth|_next/static|_next/image|favicon.ico|images|.*\\..*).*)']
}
