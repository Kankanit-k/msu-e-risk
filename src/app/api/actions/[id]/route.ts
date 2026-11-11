// Pending write actions: GET shows one to its owner, POST confirms/cancels it. Cookie auth +
// same-origin only — this is the human step a model can never perform.
import { isSameOrigin, sessionCaller } from '@/mcp/auth'
import { confirmAction } from '@/mcp/run'
import { getStore } from '@/mcp/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export const GET = async (_req: Request, { params }: Ctx) => {
  const caller = await sessionCaller()

  if (!caller) return Response.json({ error: 'login_required' }, { status: 401 })

  const { id } = await params
  const action = (await getStore().read()).actions.find(a => a.id === id && a.userId === caller.userId)

  if (!action) return Response.json({ error: 'not_found' }, { status: 404 })

  const { preview, status, expiresAt, tool, clientId, result } = action

  return Response.json({ id, preview, status, expiresAt, tool, clientId, result })
}

export const POST = async (req: Request, { params }: Ctx) => {
  if (!isSameOrigin(req)) return Response.json({ error: 'bad origin' }, { status: 403 })

  const caller = await sessionCaller()

  if (!caller) return Response.json({ error: 'login_required' }, { status: 401 })

  const { id } = await params
  const body = (await req.json().catch(() => ({}))) as { decision?: string }
  const outcome = await confirmAction(caller, id, body.decision === 'cancel' ? 'cancel' : 'confirm')

  return Response.json(outcome, { status: outcome.ok ? 200 : 409 })
}
