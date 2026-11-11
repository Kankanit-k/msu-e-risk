// RFC 7009 token revocation. Always 200, even for unknown tokens.
import { clientIp, rateLimit } from '@/libs/rateLimit'
import { revokeByToken } from '@/mcp/oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = async (req: Request) => {
  if (!rateLimit(`revoke:${clientIp(req)}`, 30)) return Response.json({ error: 'slow_down' }, { status: 429 })

  const token = new URLSearchParams(await req.text()).get('token')

  if (token) await revokeByToken(token)

  return new Response(null, { status: 200 })
}
