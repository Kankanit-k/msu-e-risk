// Server-side validation for /api/erm1 (the dialogs validate too, but never trust the client).
import { z } from 'zod'

import { PESTEL, SEVEN_S, SOFC } from '@/services/erm1Types'

import { unit, year } from '../so/schema'

const text = z.string().trim().max(5000, 'ข้อความยาวเกิน 5,000 ตัวอักษร')
const name = z.string().trim().min(3, 'ชื่อกระบวนการอย่างน้อย 3 ตัวอักษร').max(500)

const section = (keys: readonly { key: string }[]) =>
  z.strictObject(Object.fromEntries(keys.map(k => [k.key, text.optional()])))

export const processCreate = z.object({
  year,
  unit,
  goalId: z.string().uuid('กรุณาเลือกเป้าประสงค์'),
  name
})

export const processPatch = z
  .strictObject({
    name: name.optional(),
    pestel: section(PESTEL).optional(),
    sevenS: section(SEVEN_S).optional(),
    situation: text.optional(),
    keyRisks: z
      .array(
        z.object({
          id: z.string().uuid().optional(),
          text: z.string().trim().min(3, 'กรุณาระบุเหตุการณ์ความเสี่ยงอย่างน้อย 3 ตัวอักษร').max(1000),
          sofc: z.enum(SOFC.map(s => s.key) as [string, ...string[]], { message: 'กรุณาเลือกประเภทความเสี่ยง (SOFC)' })
        })
      )
      .max(50)
      .optional()
  })
  .refine(v => Object.keys(v).length > 0, 'ไม่มีข้อมูลที่จะบันทึก')
