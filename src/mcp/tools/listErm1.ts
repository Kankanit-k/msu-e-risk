import { z } from 'zod'

import { UNITS } from '@/configs/units'
import { listErm1 } from '@/services/erm1'
import { PESTEL, SEVEN_S, sofcLabel, stepsDone } from '@/services/erm1Types'

import { defineTool } from '../types'

export default defineTool({
  name: 'list_erm1',
  title: 'ERM1 บริบทองค์กรและ Key Risks',
  description:
    'คืนกระบวนการดำเนินงาน(หลัก) ใน ERM1 ของปีงบประมาณและคณะ/หน่วยงาน พร้อม SO/เป้าประสงค์ที่สังกัด ผลวิเคราะห์ PESTEL, McKinsey 7S, Situation Analysis และ Key Risks + ประเภท SOFC ใช้เมื่อผู้ใช้ถามถึงบริบทองค์กร ความเสี่ยงสำคัญ หรือความคืบหน้าการกรอก ERM1',
  input: {
    year: z.number().int().min(2500).max(2700).describe('ปีงบประมาณ พ.ศ. เช่น 2569'),
    unit: z
      .enum(UNITS as [string, ...string[]])
      .default(UNITS[0])
      .describe('ชื่อคณะ/หน่วยงาน')
  },
  minRole: 'user',
  kind: 'read',
  handler: async (_caller, { year, unit }) => {
    const { goals, processes } = await listErm1(year, unit)

    return processes.map(p => {
      const g = goals.find(x => x.id === p.goalId)

      return {
        so: g?.soCode,
        goal: g ? `${g.code} ${g.name}` : undefined,
        process: p.name,
        stepsFilled: stepsDone(p).filter(Boolean).length,
        pestel: Object.fromEntries(PESTEL.filter(c => p.pestel[c.key]).map(c => [c.label, p.pestel[c.key]])),
        sevenS: Object.fromEntries(SEVEN_S.filter(c => p.sevenS[c.key]).map(c => [c.label, p.sevenS[c.key]])),
        situation: p.situation || undefined,
        keyRisks: p.keyRisks.map(k => ({ risk: k.text, type: sofcLabel(k.sofc) }))
      }
    })
  }
})
