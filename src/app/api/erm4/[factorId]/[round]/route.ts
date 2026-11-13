// PUT: save one reporting round (6 / 9 / 12 months) of one risk factor.
import { audit } from '@/libs/audit'
import { fail, guard } from '@/libs/apiGuard'
import { saveErm4 } from '@/services/erm4'

import { firstIssue } from '../../../so/schema'
import { erm4Save, round } from '../../schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ factorId: string; round: string }> }

export const PUT = async (req: Request, { params }: Ctx) => {
  const { caller, error } = await guard(req, true)

  if (!caller) return error

  const p = await params
  const r = round.safeParse(p.round)

  if (!r.success) return Response.json({ error: firstIssue(r.error) }, { status: 400 })

  const parsed = erm4Save.safeParse(await req.json().catch(() => null))

  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 })

  try {
    const { rec, before } = await saveErm4(caller, p.factorId, r.data, parsed.data)

    await audit({
      actor: caller.userId,
      action: 'erm4.save',
      target: `${rec.factorId}:${rec.round}`,
      before,
      after: rec
    })

    return Response.json(rec)
  } catch (err) {
    return fail(err)
  }
}
