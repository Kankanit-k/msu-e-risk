import { z } from 'zod'

import { UNITS } from '@/configs/units'
import { listErm3 } from '@/services/erm3'
import { factorScore, ratingText, riskLevel } from '@/services/erm2Types'
import { CONTROL_KINDS, MEASURE_TYPES, erm3StepsDone, periodText, targetText } from '@/services/erm3Types'

import { defineTool } from '../types'

export default defineTool({
  name: 'list_erm3',
  title: 'ERM3 แผนบริหารจัดการความเสี่ยง',
  description:
    'คืนแผนบริหารจัดการความเสี่ยง (ERM3) ของแต่ละปัจจัยเสี่ยงในปีงบประมาณและคณะ/หน่วยงาน: มาตรการ/แผนงาน/โครงการ/กิจกรรม (Preventive/Corrective), KPI, Leading KRIs พร้อมเป้าหมาย, ระดับความเสี่ยงที่คาดหวัง (L × I), ระยะเวลา และผู้รับผิดชอบ ใช้เมื่อผู้ใช้ถามถึงแผนจัดการความเสี่ยง มาตรการ ตัวชี้วัด หรือความคืบหน้าการกรอก ERM3',
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
    const { processes, erm2, erm3 } = await listErm3(year, unit)

    return processes.flatMap(p =>
      p.keyRisks.map(k => ({
        process: p.name,
        keyRisk: k.text,
        factors: (erm2.find(r => r.keyRiskId === k.id)?.factors ?? []).map(f => {
          const plan = erm3.find(r => r.factorId === f.id)
          const score = plan && factorScore(plan.expected)

          return {
            factor: f.text,
            stepsFilled: erm3StepsDone(plan).filter(Boolean).length,
            measures: plan?.measures.map(m => ({
              control: CONTROL_KINDS.find(c => c.key === m.control)?.label,
              type: MEASURE_TYPES.find(t => t.key === m.type)?.label,
              text: m.text
            })),
            kpis: plan?.kpis.map(i => ({ name: i.name, target: targetText(i) })),
            kris: plan?.kris.map(i => ({ name: i.name, target: targetText(i) })),
            expectedLikelihood: plan && ratingText('likelihood', plan.expected.likelihood),
            expectedImpact: plan && ratingText('impact', plan.expected.impact),
            expectedScore: score,
            expectedLevel: score === undefined ? undefined : riskLevel(score).name,
            period: plan && periodText(plan),
            supervisors: plan?.supervisors,
            owners: plan?.owners
          }
        })
      }))
    )
  }
})
