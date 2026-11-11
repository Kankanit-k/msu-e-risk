// URLs, lifetimes and the redirect allowlist for the MCP / OAuth layer.
import 'server-only'

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const isProd = process.env.NODE_ENV === 'production'

export const TTL = {
  code: 60_000,
  accessToken: 60 * 60_000, // 1 h
  refreshToken: 30 * 24 * 60 * 60_000, // 30 days, rotated on every use
  grantMax: 90 * 24 * 60 * 60_000, // hard cap: refreshing never extends a grant past this, so the role is re-read at re-consent
  pendingActionsPerUser: 20,
  action: 10 * 60_000 // pending write action waiting for a human
}

/**
 * Public base URL of this system including basePath, e.g. https://erp.msu.ac.th/digitalplan.
 * Behind a reverse proxy the request origin is often internal, so prefer the env value.
 */
export const publicBase = (req: Request) => {
  const fromEnv = process.env.MCP_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL

  if (fromEnv) return fromEnv.replace(/\/+$/, '')

  const basePath = process.env.NEXT_PUBLIC_BASEPATH?.startsWith('/') ? process.env.NEXT_PUBLIC_BASEPATH : ''

  return new URL(req.url).origin + basePath
}

// trailingSlash is on in next.config, so every advertised URL ends with "/" (no 308 hops).
export const urls = (req: Request) => {
  const base = publicBase(req)

  return {
    issuer: base,
    resource: `${base}/api/mcp/`,
    resourceMetadata: `${base}/.well-known/oauth-protected-resource/`,
    authorize: `${base}/api/oauth/authorize/`,
    token: `${base}/api/oauth/token/`,
    register: `${base}/api/oauth/register/`,
    revoke: `${base}/api/oauth/revoke/`,
    consent: `${base}/oauth/consent/`,
    action: (id: string) => `${base}/actions/${id}/`
  }
}

// Exact-match allowlist. Claude's connector callback is included by default; add the central
// chatbot's callback via MCP_ALLOWED_REDIRECT_URIS (comma-separated).
const DEFAULT_REDIRECTS = ['https://claude.ai/api/mcp/auth_callback', 'https://claude.com/api/mcp/auth_callback']

export const allowedRedirects = () =>
  (process.env.MCP_ALLOWED_REDIRECT_URIS ?? DEFAULT_REDIRECTS.join(','))
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

export const isAllowedRedirect = (uri: string) => {
  if (allowedRedirects().includes(uri)) return true

  // Local MCP clients (Inspector, Claude Code) listen on a random localhost port — dev only.
  if (!isProd) {
    try {
      const u = new URL(uri)

      return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
    } catch {
      return false
    }
  }

  return false
}

export const newToken = (bytes = 32) => randomBytes(bytes).toString('base64url')

export const sha256 = (value: string) => createHash('sha256').update(value).digest('base64url')

export const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)

  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/** PKCE S256: base64url(sha256(verifier)) must equal the stored challenge. */
export const pkceMatches = (verifier: string, challenge: string) =>
  /^[A-Za-z0-9\-._~]{43,128}$/.test(verifier) && safeEqual(sha256(verifier), challenge)

export const inFuture = (ms: number) => new Date(Date.now() + ms).toISOString()
