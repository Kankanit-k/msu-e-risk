// DEMO write tool — delete together with src/services/notes.ts once real tools exist.
import { z } from 'zod'

import { saveNote } from '@/services/notes'

import { defineTool } from '../types'

export default defineTool({
  name: 'save_note',
  title: 'บันทึกโน้ต (ตัวอย่าง)',
  description:
    'ตัวอย่าง tool ที่เขียนข้อมูล: บันทึกโน้ตสั้นของผู้ใช้ ระบบจะยังไม่บันทึกจนกว่าผู้ใช้จะกดยืนยันเอง ให้แจ้งผู้ใช้ตามข้อความที่ได้กลับมา',
  input: { text: z.string().min(1).max(500).describe('ข้อความโน้ต') },
  minRole: 'user',
  kind: 'write',
  preview: (_caller, { text }) => `บันทึกโน้ต: "${text}"`,
  handler: async (caller, { text }) => saveNote(caller, text)
})
