// GET ?year=&unit= : list SO + the source mode. POST: create a manual SO.
import { audit } from '@/libs/audit'
import { fail, guard } from '@/libs/apiGuard'
import { pmsConfigured, strategyMode } from '@/libs/pms'
import { createSo, listSo } from '@/services/so'

import { firstIssue, scopeFrom, soCreate } from './schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = async (req: Request) => {
  const { caller, error } = await guard(req)

  if (!caller) return error

  const s = scopeFrom(req)

  if (!s.success) return Response.json({ error: firstIssue(s.error) }, { status: 400 })

  return Response.json({
    items: await listSo(s.data.year, s.data.unit),
    mode: strategyMode(),
    pmsLive: pmsConfigured()
  })
}

export const POST = async (req: Request) => {
  const { caller, error } = await guard(req, true)

  if (!caller) return error

  const parsed = soCreate.safeParse(await req.json().catch(() => null))

  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 })

  try {
    const rec = await createSo(caller, parsed.data)

    await audit({ actor: caller.userId, action: 'so.create', target: rec.id, after: parsed.data })

    return Response.json(rec, { status: 201 })
  } catch (err) {
    return fail(err)
  }
}
