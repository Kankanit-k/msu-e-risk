// GET: list requests visible to the caller. POST: create a draft. Session cookie + same-origin.
import { audit } from '@/libs/audit'
import { isSameOrigin, sessionCaller } from '@/mcp/auth'
import { canApprove, createRequest, listRequests } from '@/services/requests'

import { firstIssue, requestInput } from './schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = async () => {
  const caller = await sessionCaller()

  if (!caller) return Response.json({ error: 'login_required' }, { status: 401 })

  return Response.json({ items: await listRequests(caller), canApprove: canApprove(caller), userId: caller.userId })
}

export const POST = async (req: Request) => {
  if (!isSameOrigin(req)) return Response.json({ error: 'bad origin' }, { status: 403 })

  const caller = await sessionCaller()

  if (!caller) return Response.json({ error: 'login_required' }, { status: 401 })

  const parsed = requestInput.safeParse(await req.json().catch(() => null))

  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 })

  const rec = await createRequest(caller, parsed.data)

  await audit({ actor: caller.userId, action: 'request.create', target: rec.id, after: parsed.data })

  return Response.json(rec, { status: 201 })
}
