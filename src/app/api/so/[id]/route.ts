// PUT: edit a manual SO (code, name). DELETE: remove an SO from this system (blocked while goals use it).
import { audit } from '@/libs/audit'
import { fail, guard } from '@/libs/apiGuard'
import { countGoalsOfSo } from '@/services/goals'
import { deleteSo, updateSo } from '@/services/so'

import { firstIssue, soUpdate } from '../schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export const PUT = async (req: Request, { params }: Ctx) => {
  const { caller, error } = await guard(req, true)

  if (!caller) return error

  const parsed = soUpdate.safeParse(await req.json().catch(() => null))

  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 })

  try {
    const { rec, before } = await updateSo(caller, (await params).id, parsed.data)

    await audit({ actor: caller.userId, action: 'so.update', target: rec.id, before, after: rec })

    return Response.json(rec)
  } catch (err) {
    return fail(err)
  }
}

export const DELETE = async (req: Request, { params }: Ctx) => {
  const { caller, error } = await guard(req, true)

  if (!caller) return error

  const id = (await params).id
  const goals = await countGoalsOfSo(id)

  if (goals)
    return Response.json(
      { error: `ลบไม่ได้ ยังมีเป้าประสงค์ ${goals} รายการอยู่ภายใต้ SO นี้ ให้ลบหรือย้ายเป้าประสงค์ก่อน` },
      { status: 409 }
    )

  try {
    const rec = await deleteSo(caller, id)

    await audit({ actor: caller.userId, action: 'so.delete', target: rec.id, before: rec })

    return Response.json({ ok: true })
  } catch (err) {
    return fail(err)
  }
}
