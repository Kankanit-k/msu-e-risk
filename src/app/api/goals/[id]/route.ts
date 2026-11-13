// PUT: edit a manual goal (SO, code, name). DELETE: remove a goal from this system.
import { audit } from '@/libs/audit'
import { fail, guard } from '@/libs/apiGuard'
import { countProcessesOfGoal } from '@/services/erm1'
import { deleteGoal, updateGoal } from '@/services/goals'

import { firstIssue, goalUpdate } from '../../so/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export const PUT = async (req: Request, { params }: Ctx) => {
  const { caller, error } = await guard(req, true)

  if (!caller) return error

  const parsed = goalUpdate.safeParse(await req.json().catch(() => null))

  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 })

  try {
    const { rec, before } = await updateGoal(caller, (await params).id, parsed.data)

    await audit({ actor: caller.userId, action: 'goal.update', target: rec.id, before, after: rec })

    return Response.json(rec)
  } catch (err) {
    return fail(err)
  }
}

export const DELETE = async (req: Request, { params }: Ctx) => {
  const { caller, error } = await guard(req, true)

  if (!caller) return error

  const id = (await params).id
  const processes = await countProcessesOfGoal(id)

  if (processes)
    return Response.json(
      { error: `ลบไม่ได้ ยังมีกระบวนการดำเนินงาน ${processes} รายการใน ERM1 ภายใต้เป้าประสงค์นี้ ให้ลบกระบวนการก่อน` },
      { status: 409 }
    )

  try {
    const rec = await deleteGoal(caller, id)

    await audit({ actor: caller.userId, action: 'goal.delete', target: rec.id, before: rec })

    return Response.json({ ok: true })
  } catch (err) {
    return fail(err)
  }
}
