// Server-side validation for /api/erm2 (the editor validates too, but never trust the client).
import { z } from 'zod'

import { ADEQUACY, RATING_KINDS } from '@/services/erm2Types'

const text = z.string().trim().max(5000, 'ข้อความยาวเกิน 5,000 ตัวอักษร')

const rating = (kind: keyof typeof RATING_KINDS) =>
  z.object({
    criterion: z.enum(RATING_KINDS[kind].criteria.map(c => c.key) as [string, ...string[]], {
      message: 'ไม่พบเกณฑ์ประเมินที่เลือก'
    }),
    score: z.number().int().min(1).max(5)
  })

export const erm2Save = z.strictObject({
  factors: z
    .array(
      z.strictObject({
        id: z.string().uuid().optional(),
        text: z.string().trim().min(3, 'กรุณาระบุปัจจัยเสี่ยงอย่างน้อย 3 ตัวอักษร').max(1000),
        preventive: text,
        loss: text,
        adequacy: z.enum(ADEQUACY.map(a => a.key) as [string, ...string[]]).optional(),
        likelihood: rating('likelihood').optional(),
        impact: rating('impact').optional(),
        internal: text,
        external: text
      })
    )
    .max(30, 'ปัจจัยเสี่ยงได้ไม่เกิน 30 ข้อต่อความเสี่ยง')
})
