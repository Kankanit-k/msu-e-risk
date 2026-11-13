// PUT: save the whole ERM2 (all risk factors) of one Key Risk.
import { audit } from '@/libs/audit'
import { fail, guard } from '@/libs/apiGuard'
import { saveErm2 } from '@/services/erm2'
import type { FactorInput } from '@/services/erm2'

import { firstIssue } from '../../so/schema'
import { erm2Save } from '../schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ keyRiskId: string }> }

export const PUT = async (req: Request, { params }: Ctx) => {
  const { caller, error } = await guard(req, true)

  if (!caller) return error

  const parsed = erm2Save.safeParse(await req.json().catch(() => null))

  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 })

  try {
    const { rec, before } = await saveErm2(caller, (await params).keyRiskId, parsed.data.factors as FactorInput[])

    await audit({ actor: caller.userId, action: 'erm2.save', target: rec.keyRiskId, before, after: rec })

    return Response.json(rec)
  } catch (err) {
    return fail(err)
  }
}
