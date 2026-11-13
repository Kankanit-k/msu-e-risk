// GET ?year=&unit= : SO › goals › processes for the ERM1 page. POST: add a กระบวนการดำเนินงาน(หลัก).
import { audit } from '@/libs/audit'
import { fail, guard } from '@/libs/apiGuard'
import { createProcess, listErm1 } from '@/services/erm1'

import { firstIssue, scopeFrom } from '../so/schema'
import { processCreate } from './schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = async (req: Request) => {
  const { caller, error } = await guard(req)

  if (!caller) return error

  const s = scopeFrom(req)

  if (!s.success) return Response.json({ error: firstIssue(s.error) }, { status: 400 })

  return Response.json(await listErm1(s.data.year, s.data.unit))
}

export const POST = async (req: Request) => {
  const { caller, error } = await guard(req, true)

  if (!caller) return error

  const parsed = processCreate.safeParse(await req.json().catch(() => null))

  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 })

  try {
    const rec = await createProcess(caller, parsed.data)

    await audit({ actor: caller.userId, action: 'erm1.process.create', target: rec.id, after: parsed.data })

    return Response.json(rec, { status: 201 })
  } catch (err) {
    return fail(err)
  }
}
