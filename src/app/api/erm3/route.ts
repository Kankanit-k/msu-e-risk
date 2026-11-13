// GET ?year=&unit= : SO › goals › processes › Key Risks with their ERM2 and ERM3, for the ERM2 - 3 page.
import { guard } from '@/libs/apiGuard'
import { listErm3 } from '@/services/erm3'

import { firstIssue, scopeFrom } from '../so/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = async (req: Request) => {
  const { caller, error } = await guard(req)

  if (!caller) return error

  const s = scopeFrom(req)

  if (!s.success) return Response.json({ error: firstIssue(s.error) }, { status: 400 })

  return Response.json(await listErm3(s.data.year, s.data.unit))
}
