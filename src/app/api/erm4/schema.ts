// Server-side validation for /api/erm4.
import { z } from 'zod'

import { ROUNDS } from '@/services/erm4Types'

import { scored } from '../erm3/schema'

const text = z.string().trim().max(5000, 'ข้อความยาวเกิน 5,000 ตัวอักษร')
const byId = <T extends z.ZodTypeAny>(v: T) => z.record(z.string().uuid(), v).refine(o => Object.keys(o).length <= 60)
const indicatorResult = z.strictObject({ detail: text, value: z.number().finite().optional() })

export const round = z.coerce
  .number()
  .refine(
    (n): n is (typeof ROUNDS)[number] => (ROUNDS as readonly number[]).includes(n),
    'รอบต้องเป็น 6, 9 หรือ 12 เดือน'
  )

export const erm4Save = z.strictObject({
  measures: byId(z.strictObject({ result: text, percent: z.number().min(0).max(100).optional() })),
  kpis: byId(indicatorResult),
  kris: byId(indicatorResult),
  level: scored,
  links: z
    .array(
      z.strictObject({
        label: z.string().trim().max(200),
        url: z
          .string()
          .trim()
          .url('ลิงก์ไม่ถูกต้อง')
          .refine(u => /^https?:\/\//i.test(u), 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://')
      })
    )
    .max(20, 'ลิงก์ได้ไม่เกิน 20 รายการ'),
  files: z.array(z.string().regex(/^[0-9a-f]{32}$/, 'รหัสไฟล์ไม่ถูกต้อง')).max(30, 'ไฟล์แนบได้ไม่เกิน 30 ไฟล์')
})
