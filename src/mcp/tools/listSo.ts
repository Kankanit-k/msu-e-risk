import { z } from 'zod'

import { UNITS } from '@/configs/units'
import { listSo } from '@/services/so'

import { defineTool } from '../types'

export default defineTool({
  name: 'list_so',
  title: 'รายการวัตถุประสงค์เชิงกลยุทธ์ (SO)',
  description: 'คืนรายการ SO ของปีงบประมาณและคณะ/หน่วยงานที่ระบุ ใช้เมื่อผู้ใช้ถามว่าหน่วยงานมี SO อะไรบ้าง',
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
    (await listSo(year, unit)).map(r => ({ code: r.code, name: r.name, source: r.source }))
})
