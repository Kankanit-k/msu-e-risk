// PATCH: rename a process and/or save its ERM1 analysis sections. DELETE: remove it with its analysis.
import { audit } from '@/libs/audit'
import { fail, guard } from '@/libs/apiGuard'
import { deleteProcess, updateProcess } from '@/services/erm1'
import type { ProcessPatch } from '@/services/erm1'

import { firstIssue } from '../../so/schema'
import { processPatch } from '../schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = async (req: Request, { params }: Ctx) => {
  const { caller, error } = await guard(req, true)

  if (!caller) return error

  const parsed = processPatch.safeParse(await req.json().catch(() => null))

  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 })

  try {
    const { rec, before } = await updateProcess(caller, (await params).id, parsed.data as ProcessPatch)

    await audit({ actor: caller.userId, action: 'erm1.process.update', target: rec.id, before, after: rec })

    return Response.json(rec)
  } catch (err) {
    return fail(err)
  }
}

export const DELETE = async (req: Request, { params }: Ctx) => {
  const { caller, error } = await guard(req, true)

  if (!caller) return error

  try {
    const rec = await deleteProcess(caller, (await params).id)

    await audit({ actor: caller.userId, action: 'erm1.process.delete', target: rec.id, before: rec })

    return Response.json({ ok: true })
  } catch (err) {
    return fail(err)
  }
}
