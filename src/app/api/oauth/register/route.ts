// RFC 7591 dynamic client registration — only redirect URIs on the allowlist are accepted.
import { clientIp, rateLimit } from '@/libs/rateLimit'
import { OAuthError, noStore, oauthErrorResponse, registerClient } from '@/mcp/oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = async (req: Request) => {
  if (!rateLimit(`register:${clientIp(req)}`, 10)) return Response.json({ error: 'slow_down' }, { status: 429 })

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) throw new OAuthError('invalid_client_metadata', 'ต้องส่ง JSON')

    const client = await registerClient(body)

    return Response.json(
      {
        client_id: client.client_id,
        client_name: client.client_name,
        redirect_uris: client.redirect_uris,
        client_id_issued_at: Math.floor(Date.parse(client.created_at) / 1000),
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none'
      },
      { status: 201, headers: noStore }
    )
  } catch (err) {
    return oauthErrorResponse(err)
  }
}
