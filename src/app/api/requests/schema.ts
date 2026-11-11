// Server-side validation for request payloads (the form validates too, but never trust the client).
import { z } from 'zod'

import { categories } from '@/services/requestTypes'

export const requestInput = z.object({
  title: z.string().trim().min(3, 'ชื่อคำขออย่างน้อย 3 ตัวอักษร').max(120),
  category: z.enum(categories.map(c => c.value) as [string, ...string[]]),
  amount: z.coerce.number().positive('จำนวนเงินต้องมากกว่า 0').max(10_000_000),
  neededBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'วันที่ไม่ถูกต้อง'),
  detail: z.string().trim().max(2000).default('')
})

export const firstIssue = (err: z.ZodError) => err.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง'
