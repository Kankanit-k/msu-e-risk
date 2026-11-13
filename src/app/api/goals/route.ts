// GET ?year=&unit=[&soId=] : list goals + the source mode. POST: create a manual goal.
import { audit } from '@/libs/audit'
import { fail, guard } from '@/libs/apiGuard'
import { pmsConfigured, strategyMode } from '@/libs/pms'
import { createGoal, listGoals } from '@/services/goals'

import { firstIssue, goalCreate, scopeFrom } from '../so/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = async (req: Request) => {
  const { caller, error } = await guard(req)

  if (!caller) return error

  const s = scopeFrom(req)

  if (!s.success) return Response.json({ error: firstIssue(s.error) }, { status: 400 })

  return Response.json({
    items: await listGoals(s.data.year, s.data.unit, s.data.soId),
    mode: strategyMode(),
    pmsLive: pmsConfigured()
  })
}

export const POST = async (req: Request) => {
  const { caller, error } = await guard(req, true)

  if (!caller) return error

  const parsed = goalCreate.safeParse(await req.json().catch(() => null))

  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 })

  try {
    const rec = await createGoal(caller, parsed.data)

    await audit({ actor: caller.userId, action: 'goal.create', target: rec.id, after: parsed.data })

    return Response.json(rec, { status: 201 })
  } catch (err) {
    return fail(err)
  }
}
