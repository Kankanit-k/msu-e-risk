// PUT: save the whole ERM3 (risk management plan) of one risk factor.
import { audit } from '@/libs/audit'
import { fail, guard } from '@/libs/apiGuard'
import { saveErm3 } from '@/services/erm3'
import type { Erm3SaveInput } from '@/services/erm3'

import { firstIssue } from '../../so/schema'
import { erm3Save } from '../schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ factorId: string }> }

export const PUT = async (req: Request, { params }: Ctx) => {
  const { caller, error } = await guard(req, true)

  if (!caller) return error

  const parsed = erm3Save.safeParse(await req.json().catch(() => null))

  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 })

  try {
    const { rec, before } = await saveErm3(caller, (await params).factorId, parsed.data as Erm3SaveInput)

    await audit({ actor: caller.userId, action: 'erm3.save', target: rec.factorId, before, after: rec })

    return Response.json(rec)
  } catch (err) {
    return fail(err)
  }
}
