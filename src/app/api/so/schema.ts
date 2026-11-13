// Server-side validation shared by /api/so and /api/goals (the forms validate too, but never trust the client).
import { z } from 'zod'

import { UNITS } from '@/configs/units'

export const year = z.coerce.number().int().min(2500).max(2700)
export const unit = z.enum(UNITS as [string, ...string[]], { message: 'ไม่พบคณะ/หน่วยงานนี้' })
const soId = z.string().uuid('กรุณาเลือกวัตถุประสงค์เชิงกลยุทธ์')

const fields = {
  code: z.string().trim().min(1, 'กรุณากรอกรหัส').max(20, 'รหัสยาวเกิน 20 ตัวอักษร'),
  name: z.string().trim().min(3, 'ชื่ออย่างน้อย 3 ตัวอักษร').max(500)
}

export const soCreate = z.object({ year, unit, ...fields })
export const soUpdate = z.object(fields)
export const goalCreate = z.object({ year, unit, soId, ...fields })
export const goalUpdate = z.object({ soId, ...fields })

export const importBody = z.discriminatedUnion('from', [
  z.object({
    from: z.literal('pms'),
    year,
    unit,
    pmsIds: z.array(z.string().max(100)).min(1, 'เลือกอย่างน้อย 1 รายการ').max(200)
  }),
  z.object({ from: z.literal('lastYear'), year, unit })
])

export const firstIssue = (err: z.ZodError) => err.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง'

/** ?year=&unit=[&soId=] */
export const scopeFrom = (req: Request) => {
  const q = new URL(req.url).searchParams

  return z
    .object({ year, unit, soId: soId.optional() })
    .safeParse({ year: q.get('year'), unit: q.get('unit'), soId: q.get('soId') || undefined })
}
