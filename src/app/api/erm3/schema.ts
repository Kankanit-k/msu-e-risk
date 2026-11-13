// Server-side validation for /api/erm3 (the editor validates too, but never trust the client).
import { z } from 'zod'

import { RATING_KINDS } from '@/services/erm2Types'
import { CONTROL_KINDS, MEASURE_TYPES, TARGET_DIRECTIONS } from '@/services/erm3Types'

const keys = <T extends readonly { key: string }[]>(list: T) => list.map(x => x.key) as [string, ...string[]]
const short = z.string().trim().max(500, 'ข้อความยาวเกิน 500 ตัวอักษร')

export const rating = (kind: keyof typeof RATING_KINDS) =>
  z.object({
    criterion: z.enum(keys(RATING_KINDS[kind].criteria), { message: 'ไม่พบเกณฑ์ประเมินที่เลือก' }),
    score: z.number().int().min(1).max(5)
  })

export const scored = z.strictObject({
  likelihood: rating('likelihood').optional(),
  impact: rating('impact').optional()
})

const indicator = z.strictObject({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(3, 'กรุณาระบุชื่อตัวชี้วัดอย่างน้อย 3 ตัวอักษร').max(500),
  detail: z.string().trim().max(5000, 'รายละเอียดยาวเกิน 5,000 ตัวอักษร'),
  direction: z.enum(keys(TARGET_DIRECTIONS)),
  target: z.number().finite().optional(),
  unit: z.string().trim().max(50),
  levels: z.array(z.strictObject({ criterion: short, note: short })).length(5)
})

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง')
  .refine(s => new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), 'วันที่ไม่ถูกต้อง')

const names = z.array(z.string().trim().min(1).max(200)).max(20, 'ได้ไม่เกิน 20 รายการ')

export const erm3Save = z
  .strictObject({
    measures: z
      .array(
        z.strictObject({
          id: z.string().uuid().optional(),
          control: z.enum(keys(CONTROL_KINDS)),
          type: z.enum(keys(MEASURE_TYPES)),
          text: z.string().trim().min(3, 'กรุณาระบุมาตรการอย่างน้อย 3 ตัวอักษร').max(1000)
        })
      )
      .max(60, 'มาตรการได้ไม่เกิน 60 รายการ'),
    kpis: z.array(indicator).max(20, 'KPI ได้ไม่เกิน 20 ตัว'),
    kris: z.array(indicator).max(20, 'KRIs ได้ไม่เกิน 20 ตัว'),
    expected: scored,
    start: ymd.optional(),
    end: ymd.optional(),
    supervisors: names,
    owners: names
  })
  .refine(v => !v.start || !v.end || v.start <= v.end, { message: 'วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม' })
