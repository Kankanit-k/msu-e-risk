// The signed-in user's own connections (for the "การเชื่อมต่อของฉัน" page). Cookie auth.
import { isSameOrigin, sessionCaller } from '@/mcp/auth'
import { revokeGrant } from '@/mcp/oauth'
import { getStore } from '@/mcp/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = async () => {
  const caller = await sessionCaller()

  if (!caller) return Response.json({ error: 'login_required' }, { status: 401 })

  const data = await getStore().read()

  const grants = data.grants
    .filter(g => g.user.userId === caller.userId)
    .map(g => ({
      id: g.id,
      client: data.clients.find(c => c.client_id === g.clientId)?.client_name ?? g.clientId,
      scopes: g.scopes,
      createdAt: g.createdAt,
      lastUsedAt: g.lastUsedAt,
      revokedAt: g.revokedAt
    }))

  return Response.json({ grants })
}

export const DELETE = async (req: Request) => {
  if (!isSameOrigin(req)) return Response.json({ error: 'bad origin' }, { status: 403 })

  const caller = await sessionCaller()

  if (!caller) return Response.json({ error: 'login_required' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id') ?? ''

  return (await revokeGrant(caller.userId, id)) ? Response.json({ ok: true }) : Response.json({ ok: false }, { status: 404 })
}
