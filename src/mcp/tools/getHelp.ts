import { z } from 'zod'

import { helpByPage, helpFor } from '@/data/help'

import { defineTool } from '../types'

export default defineTool({
  name: 'get_help',
  title: 'วิธีใช้งานระบบ',
  description:
    'คืนคำอธิบายวิธีใช้งานของหน้าในระบบ ถ้าไม่ระบุ page จะคืนรายชื่อหน้าที่มีคู่มือ ใช้เมื่อผู้ใช้ถามว่าทำอย่างไร หรือหน้าไหนใช้ทำอะไร',
  input: { page: z.string().max(200).optional().describe('path ของหน้า เช่น "/home" หรือ "/connections"') },
  minRole: 'user',
  kind: 'read',
  handler: async (_caller, { page }) => {
    if (!page) return Object.entries(helpByPage).map(([path, h]) => ({ path, title: h.title, summary: h.summary }))

    return helpFor(page)?.help ?? { message: `ยังไม่มีคู่มือของหน้า ${page}` }
  }
})
