// Token endpoint: authorization_code (with PKCE) and rotating refresh_token. Public clients only.
import { clientIp, rateLimit } from '@/libs/rateLimit'
import { OAuthError, exchangeCode, oauthErrorResponse, refresh } from '@/mcp/oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = async (req: Request) => {
  if (!rateLimit(`token:${clientIp(req)}`, 30)) return Response.json({ error: 'slow_down' }, { status: 429 })

  try {
    const params = new URLSearchParams(await req.text())
    const grantType = params.get('grant_type')

    if (grantType === 'authorization_code') return await exchangeCode(params)
    if (grantType === 'refresh_token') return await refresh(params)

    throw new OAuthError('unsupported_grant_type', 'รองรับ authorization_code และ refresh_token')
  } catch (err) {
    return oauthErrorResponse(err)
  }
}
