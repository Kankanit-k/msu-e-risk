// PUT: edit a draft. POST: workflow action { action: 'submit' | 'approve' | 'reject', note? }.
import { z } from 'zod'

import { audit } from '@/libs/audit'
import { isSameOrigin, sessionCaller } from '@/mcp/auth'
import { notify } from '@/libs/notify'
import { RequestError, transitionRequest, updateRequest } from '@/services/requests'
import { statusLabel } from '@/services/requestTypes'

import { firstIssue, requestInput } from '../schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const actionInput = z.object({ action: z.enum(['submit', 'approve', 'reject']), note: z.string().trim().max(500).optional() })

const guard = async (req: Request) => {
  if (!isSameOrigin(req)) return { error: Response.json({ error: 'bad origin' }, { status: 403 }) }

  const caller = await sessionCaller()

  return caller ? { caller } : { error: Response.json({ error: 'login_required' }, { status: 401 }) }
}

const fail = (err: unknown) => {
  if (err instanceof RequestError) return Response.json({ error: err.message }, { status: err.status })
  throw err
}

export const PUT = async (req: Request, { params }: Ctx) => {
  const { caller, error } = await guard(req)

  if (!caller) return error

  const parsed = requestInput.safeParse(await req.json().catch(() => null))

  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 })

  try {
    const { rec, before } = await updateRequest(caller, (await params).id, parsed.data)

    await audit({ actor: caller.userId, action: 'request.update', target: rec.id, before, after: rec })

    return Response.json(rec)
  } catch (err) {
    return fail(err)
  }
}

export const POST = async (req: Request, { params }: Ctx) => {
  const { caller, error } = await guard(req)

  if (!caller) return error

  const parsed = actionInput.safeParse(await req.json().catch(() => null))

  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 })

  if (parsed.data.action === 'reject' && !parsed.data.note) {
    return Response.json({ error: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ' }, { status: 400 })
  }

  try {
    const { rec, before } = await transitionRequest(caller, (await params).id, parsed.data.action, parsed.data.note)

    await audit({
      actor: caller.userId,
      action: `request.${parsed.data.action}`,
      target: rec.id,
      before,
      after: { status: rec.status, note: parsed.data.note }
    })

    // Fire and forget: a slow LINE/SMTP server must not delay the response.
    void notify({
      subject: `คำขอ "${rec.title}" — ${statusLabel[rec.status]}`,
      text: `ผู้ยื่น: ${rec.requesterName}\nดำเนินการโดย: ${caller.name}${parsed.data.note ? `\nหมายเหตุ: ${parsed.data.note}` : ''}`
    })

    return Response.json(rec)
  } catch (err) {
    return fail(err)
  }
}
