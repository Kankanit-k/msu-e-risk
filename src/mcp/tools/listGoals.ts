import { z } from 'zod'

import { UNITS } from '@/configs/units'
import { listGoals } from '@/services/goals'

import { defineTool } from '../types'

export default defineTool({
  name: 'list_goals',
  title: 'รายการเป้าประสงค์',
  description:
    'คืนรายการเป้าประสงค์พร้อม SO ที่สังกัด ของปีงบประมาณและคณะ/หน่วยงานที่ระบุ ใช้เมื่อผู้ใช้ถามว่าหน่วยงานมีเป้าประสงค์อะไรบ้าง',
  input: {
    year: z.number().int().min(2500).max(2700).describe('ปีงบประมาณ พ.ศ. เช่น 2569'),
    unit: z
      .enum(UNITS as [string, ...string[]])
      .default(UNITS[0])
      .describe('ชื่อคณะ/หน่วยงาน')
  },
  minRole: 'user',
  kind: 'read',
  handler: async (_caller, { year, unit }) =>
    (await listGoals(year, unit)).map(r => ({ so: r.soCode, code: r.code, name: r.name, source: r.source }))
})
