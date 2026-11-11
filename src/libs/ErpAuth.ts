import type { NextAuthOptions } from 'next-auth'

// Type Imports
import type { StaffData } from '@/types/sessionTypes'

// Lib Imports
import { DEMO_MODE } from '@/libs/demo'
import { resolveRoleForStaff } from '@/libs/roleResolver'

// Path part of the app's basePath (NEXT_PUBLIC_BASEPATH may be a full URL, see libs/logger/client.ts).
// Falls back to the basePath configured in next.config.ts, like ClientProviders does.
const basePath =
  (process.env.BASEPATH || process.env.NEXT_PUBLIC_BASEPATH || '').replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '') ||
  '/digitalplan'

// Only these profile fields ever leave the server. The ERP profile also carries secrets
// (SCOPES.twofa_secret, SCOPES.line_access_token) and the ERP access token — those must never
// reach the browser (/api/auth/session) or the logs.
const PUBLIC_FIELDS = [
  'STAFFID',
  'PREFIXID',
  'PREFIXFULLNAME',
  'STAFFNAME',
  'STAFFSURNAME',
  'STAFFEMAIL1',
  'POSID',
  'POSITIONNAME',
  'STAFFFACULTY',
  'POSTYPEID',
  'POSTYPENAME',
  'GROUPTYPENAME'
] as const

const PUBLIC_SCOPE_FIELDS = ['progcode', 'groupid', 'groupname', 'staffdepartment', 'staffdepartmentname'] as const

export const toPublicUser = (raw: Record<string, any>): StaffData => {
  const user: Record<string, any> = { id: raw.id, name: raw.name, email: raw.email }

  for (const key of PUBLIC_FIELDS) if (raw[key] !== undefined) user[key] = raw[key]

  if (raw.SCOPES && typeof raw.SCOPES === 'object') {
    user.SCOPES = {}
    for (const key of PUBLIC_SCOPE_FIELDS) if (raw.SCOPES[key] !== undefined) user.SCOPES[key] = raw.SCOPES[key]
  }

  if (raw.role !== undefined) user.role = raw.role

  return user as StaffData
}

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'erpauth',
      name: 'erpauth',
      type: 'oauth',
      issuer: 'https://erp.msu.ac.th',
      clientId: process.env.AUTH_CLIENT_ID,
      clientSecret: process.env.AUTH_CLIENT_SECRET,
      authorization: {
        url: 'https://erp.msu.ac.th/authen/oauth/_authorize',
        params: {
          grant_type: 'authorization_code',
          response_type: 'code',
          scope: ''
        }
      },
      token: 'https://erp.msu.ac.th/authen/oauth/token',
      userinfo: 'https://erp.msu.ac.th/authen/api/authuser?progcode=DigiPlan',
      profile(profile) {
        const { STAFFID, STAFFNAME, STAFFSURNAME, STAFFEMAIL1 } = profile

        return {
          id: STAFFID,
          name: `${STAFFNAME} ${STAFFSURNAME}`,
          email: STAFFEMAIL1,
          ...profile
        }
      }
    }
  ],

  // Sign-in is started only from the profile menu (see UserDropdown). These pages keep NextAuth
  // from sending users to its default screens; anything unknown falls back to the home page.
  // NextAuth uses these paths as-is (no basePath), so the basePath is added here.
  pages: {
    signIn: `${basePath}/`,
    error: `${basePath}/`
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // A demo token is worthless when demo mode is off: throwing makes next-auth drop the session
      // (core/routes/session.js catches it, empty session + cleared cookie).
      if (token.demo === true && !DEMO_MODE) throw new Error('Demo sessions are disabled')

      if (user) {
        const raw = user as Record<string, any>

        // The session JWT is encrypted, but keep it minimal anyway: the public profile plus the
        // ERP access token for server-side calls. The 2FA secret and LINE token are dropped here.
        token.user = toPublicUser(raw)
        token.erpAccessToken = account?.access_token

        // Application role from the server-side allowlists (ROLE_UNIVERSITY_ADMINS / ROLE_DEPT_ADMINS).
        token.role = resolveRoleForStaff(String(raw.STAFFID ?? raw.id))
      }

      return token
    },
    async session({ session, token }) {
      // Never spread the token here — it holds erpAccessToken.
      return {
        ...session,
        user: toPublicUser((token.user as Record<string, any>) ?? {}),
        role: token.role,
        demo: token.demo === true
      }
    },
    async redirect({ url, baseUrl }) {
      // Only same-origin targets (baseUrl is the bare origin); anything else goes to the home page.
      try {
        const target = new URL(url, baseUrl)

        if (target.origin === baseUrl) return target.toString()
      } catch {
        // malformed URL → fall through
      }

      return `${baseUrl}${basePath}/`
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8
  }
}
