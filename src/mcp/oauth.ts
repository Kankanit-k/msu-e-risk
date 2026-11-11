// OAuth 2.1 authorization-server logic for MCP clients. The user signs in with the system's
// existing ERP login; this layer only issues our own MCP-scoped tokens (never ERP tokens).
import 'server-only'

import { logger } from '@/libs/logger'

import { getStore } from './store'
import type { ClientRecord, GrantRecord } from './store'
import { TTL, inFuture, isAllowedRedirect, newToken, pkceMatches, sha256 } from './config'
import { ALL_SCOPES } from './types'
import type { Caller, McpScope } from './types'

export class OAuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message)
  }
}

export const oauthErrorResponse = (err: unknown) => {
  if (err instanceof OAuthError)
    return Response.json({ error: err.code, error_description: err.message }, { status: err.status, headers: noStore })

  logger.error('oauth failure', { source: 'mcp', error: err })

  return Response.json({ error: 'server_error' }, { status: 500, headers: noStore })
}

export const noStore = { 'cache-control': 'no-store', pragma: 'no-cache' }

export const parseScopes = (raw: string | null | undefined): McpScope[] => {
  const asked = (raw ?? '').split(/\s+/).filter(Boolean)

  // No scope asked → read only. Unknown scopes are ignored.
  const scopes = ALL_SCOPES.filter(s => asked.includes(s))

  return scopes.length ? scopes : ['mcp:read']
}

// ---- Registration (RFC 7591) -------------------------------------------------------------------

export const registerClient = async (body: Record<string, unknown>): Promise<ClientRecord> => {
  const redirects = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u): u is string => typeof u === 'string') : []

  if (redirects.length > 5) throw new OAuthError('invalid_redirect_uri', 'redirect_uris มากเกินไป')
  if (!redirects.length) throw new OAuthError('invalid_redirect_uri', 'ต้องระบุ redirect_uris')

  const rejected = redirects.filter(u => !isAllowedRedirect(u))

  if (rejected.length) throw new OAuthError('invalid_redirect_uri', `redirect_uri ไม่อยู่ในรายการที่อนุญาต: ${rejected.join(', ')}`)

  const client: ClientRecord = {
    client_id: newToken(16),
    client_name: typeof body.client_name === 'string' ? body.client_name.slice(0, 100) : 'MCP client',
    redirect_uris: redirects,
    created_at: new Date().toISOString()
  }

  await getStore().update(d => void d.clients.push(client))
  logger.info('mcp client registered', { source: 'mcp', context: { audit: true, clientId: client.client_id, name: client.client_name, redirects } })

  return client
}

// ---- Authorization request ----------------------------------------------------------------------

export type AuthRequest = {
  client: ClientRecord
  redirectUri: string
  state?: string
  codeChallenge: string
  scopes: McpScope[]
}

/** Validates an authorize request. Throws before we know the redirect is safe; never redirects errors to an unvetted URI. */
export const validateAuthRequest = async (p: URLSearchParams): Promise<AuthRequest> => {
  const data = await getStore().read()
  const client = data.clients.find(c => c.client_id === p.get('client_id'))

  if (!client) throw new OAuthError('invalid_client', 'ไม่รู้จัก client นี้')

  const redirectUri = p.get('redirect_uri') ?? ''

  // Must be registered for this client AND still on the allowlist (allowlist may shrink later).
  if (!client.redirect_uris.includes(redirectUri) || !isAllowedRedirect(redirectUri))
    throw new OAuthError('invalid_request', 'redirect_uri ไม่ถูกต้อง')

  if (p.get('response_type') !== 'code') throw new OAuthError('unsupported_response_type', 'รองรับเฉพาะ response_type=code')

  const codeChallenge = p.get('code_challenge') ?? ''

  if (p.get('code_challenge_method') !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge))
    throw new OAuthError('invalid_request', 'ต้องใช้ PKCE แบบ S256')

  return { client, redirectUri, state: p.get('state') ?? undefined, codeChallenge, scopes: parseScopes(p.get('scope')) }
}

export const issueCode = async (req: AuthRequest, caller: Caller, scopes: McpScope[]) => {
  const code = newToken()

  await getStore().update(d =>
    void d.codes.push({
      hash: sha256(code),
      grantDraft: {
        clientId: req.client.client_id,
        user: { userId: caller.userId, name: caller.name, email: caller.email, role: caller.role },
        scopes,
        createdAt: new Date().toISOString()
      },
      redirectUri: req.redirectUri,
      codeChallenge: req.codeChallenge,
      expiresAt: inFuture(TTL.code)
    })
  )

  return code
}

// ---- Token endpoint ------------------------------------------------------------------------------

const tokenResponse = (accessToken: string, refreshToken: string, scopes: McpScope[]) =>
  Response.json(
    {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: TTL.accessToken / 1000,
      refresh_token: refreshToken,
      scope: scopes.join(' ')
    },
    { headers: noStore }
  )

export const exchangeCode = async (p: URLSearchParams) => {
  const code = p.get('code') ?? ''
  const verifier = p.get('code_verifier') ?? ''
  const accessToken = newToken()
  const refreshToken = newToken()

  const grant = await getStore().update(d => {
    const idx = d.codes.findIndex(c => c.hash === sha256(code))
    const rec = idx >= 0 ? d.codes[idx] : null

    // Single use: remove it whatever happens next.
    if (idx >= 0) d.codes.splice(idx, 1)

    // Return (not throw) on failure so the code removal above is still persisted.
    if (!rec || Date.parse(rec.expiresAt) <= Date.now()) return 'code ไม่ถูกต้องหรือหมดอายุ'
    if (rec.grantDraft.clientId !== p.get('client_id')) return 'client ไม่ตรงกับ code'
    if (rec.redirectUri !== p.get('redirect_uri')) return 'redirect_uri ไม่ตรงกับ code'
    if (!pkceMatches(verifier, rec.codeChallenge)) return 'code_verifier ไม่ถูกต้อง'

    const g: GrantRecord = {
      ...rec.grantDraft,
      id: crypto.randomUUID(),
      refreshHash: sha256(refreshToken),
      refreshExpiresAt: inFuture(TTL.refreshToken),
      usedRefreshHashes: []
    }

    d.grants.push(g)
    d.accessTokens.push({ hash: sha256(accessToken), grantId: g.id, expiresAt: inFuture(TTL.accessToken) })

    return g
  })

  if (typeof grant === 'string') throw new OAuthError('invalid_grant', grant)

  logger.info('mcp grant issued', { source: 'mcp', context: { audit: true, grantId: grant.id, clientId: grant.clientId, userId: grant.user.userId, scopes: grant.scopes } })

  return tokenResponse(accessToken, refreshToken, grant.scopes)
}

export const refresh = async (p: URLSearchParams) => {
  const presented = sha256(p.get('refresh_token') ?? '')
  const accessToken = newToken()
  const refreshToken = newToken()

  const result = await getStore().update(d => {
    const g = d.grants.find(x => x.refreshHash === presented || x.usedRefreshHashes.includes(presented))

    if (!g || g.revokedAt || g.clientId !== p.get('client_id')) return { error: 'invalid' as const }

    // An already-rotated refresh token came back → it was copied. Kill the whole grant.
    if (g.refreshHash !== presented) {
      g.revokedAt = new Date().toISOString()
      d.accessTokens = d.accessTokens.filter(t => t.grantId !== g.id)

      return { error: 'reuse' as const, grant: structuredClone(g) }
    }

    if (Date.parse(g.refreshExpiresAt) <= Date.now()) return { error: 'invalid' as const }

    g.usedRefreshHashes = [...g.usedRefreshHashes, g.refreshHash].slice(-20)
    g.refreshHash = sha256(refreshToken)
    g.refreshExpiresAt = new Date(Math.min(Date.now() + TTL.refreshToken, Date.parse(g.createdAt) + TTL.grantMax)).toISOString()
    g.lastUsedAt = new Date().toISOString()
    d.accessTokens.push({ hash: sha256(accessToken), grantId: g.id, expiresAt: inFuture(TTL.accessToken) })

    return { grant: structuredClone(g) }
  })

  if (result.error === 'reuse')
    logger.warn('mcp refresh token reuse — grant revoked', { source: 'mcp', context: { audit: true, grantId: result.grant.id, userId: result.grant.user.userId } })

  if (result.error) throw new OAuthError('invalid_grant', 'refresh_token ไม่ถูกต้อง')

  return tokenResponse(accessToken, refreshToken, result.grant!.scopes)
}

// ---- Revocation ------------------------------------------------------------------------------------

/** Revoke by token (RFC 7009) — works with either the access or the refresh token. */
export const revokeByToken = async (token: string) => {
  const hash = sha256(token)

  await getStore().update(d => {
    const grantId = d.accessTokens.find(t => t.hash === hash)?.grantId ?? d.grants.find(g => g.refreshHash === hash)?.id

    revokeGrantIn(d, grantId)
  })
}

export const revokeGrant = async (userId: string, grantId: string) =>
  getStore().update(d => {
    const g = d.grants.find(x => x.id === grantId && x.user.userId === userId)

    if (!g) return false
    revokeGrantIn(d, g.id)
    logger.info('mcp grant revoked by user', { source: 'mcp', context: { audit: true, grantId, userId } })

    return true
  })

const revokeGrantIn = (d: { grants: GrantRecord[]; accessTokens: { grantId: string }[] }, grantId?: string) => {
  const g = grantId ? d.grants.find(x => x.id === grantId) : undefined

  if (!g) return
  g.revokedAt ??= new Date().toISOString()
  d.accessTokens = d.accessTokens.filter(t => t.grantId !== g.id) as typeof d.accessTokens
}
