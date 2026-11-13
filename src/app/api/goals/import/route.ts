// POST { from: 'pms', year, unit, pmsIds } | { from: 'lastYear', year, unit }
import { audit } from '@/libs/audit'
import { fail, guard } from '@/libs/apiGuard'
import { importGoalsFromLastYear, importGoalsFromPms } from '@/services/goals'

import { firstIssue, importBody } from '../../so/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = async (req: Request) => {
  const { caller, error } = await guard(req, true)

  if (!caller) return error

  const parsed = importBody.safeParse(await req.json().catch(() => null))

  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 })

  const b = parsed.data

  try {
    const result =
      b.from === 'pms'
        ? await importGoalsFromPms(caller, b.year, b.unit, b.pmsIds)
        : await importGoalsFromLastYear(caller, b.year, b.unit)

    await audit({
      actor: caller.userId,
      action: `goal.import.${b.from}`,
      target: `${b.year}/${b.unit}`,
      after: { added: result.added.map(r => r.code), skipped: result.skipped }
    })

    return Response.json(result)
  } catch (err) {
    return fail(err)
  }
}
