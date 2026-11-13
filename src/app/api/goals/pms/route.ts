// GET ?year=&unit= : goals available in PMS (flagged when imported, or blocked until their SO is imported).
import { fail, guard } from '@/libs/apiGuard'
import { listPmsGoals } from '@/services/goals'

import { firstIssue, scopeFrom } from '../../so/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = async (req: Request) => {
  const { caller, error } = await guard(req)

  if (!caller) return error

  const s = scopeFrom(req)

  if (!s.success) return Response.json({ error: firstIssue(s.error) }, { status: 400 })

  try {
    return Response.json(await listPmsGoals(s.data.year, s.data.unit))
  } catch (err) {
    return fail(err)
  }
}
