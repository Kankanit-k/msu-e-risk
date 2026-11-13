// GET ?year=&unit= : the ERM3 tree plus every ERM4 round, for the ERM4 page.
import { guard } from '@/libs/apiGuard'
import { listErm4 } from '@/services/erm4'

import { firstIssue, scopeFrom } from '../so/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = async (req: Request) => {
  const { caller, error } = await guard(req)

  if (!caller) return error

  const s = scopeFrom(req)

  if (!s.success) return Response.json({ error: firstIssue(s.error) }, { status: 400 })

  return Response.json(await listErm4(s.data.year, s.data.unit))
}
