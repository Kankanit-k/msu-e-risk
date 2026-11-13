import { z } from 'zod'

import { UNITS } from '@/configs/units'
import { listErm2 } from '@/services/erm2'
import { adequacyLabel, factorScore, ratingText, riskLevel, stepsDone } from '@/services/erm2Types'

import { defineTool } from '../types'

export default defineTool({
  name: 'list_erm2',
  title: 'ERM2 ปัจจัยเสี่ยงและระดับความเสี่ยง',
  description:
    'คืนความเสี่ยง (Key Risks จาก ERM1) ของปีงบประมาณและคณะ/หน่วยงาน พร้อมปัจจัยเสี่ยง การควบคุมที่มีอยู่ (Preventive/Loss, เพียงพอหรือไม่) ระดับความเสี่ยง ณ เริ่มต้น (L × I) และความเสี่ยงที่เหลืออยู่ ใช้เมื่อผู้ใช้ถามถึงการประเมินความเสี่ยง ระดับความเสี่ยง หรือความคืบหน้าการกรอก ERM2',
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
    const { processes, erm2 } = await listErm2(year, unit)

    return processes.flatMap(p =>
      p.keyRisks.map(k => {
        const factors = erm2.find(r => r.keyRiskId === k.id)?.factors ?? []

        return {
          process: p.name,
          keyRisk: k.text,
          stepsFilled: stepsDone(factors).filter(Boolean).length,
          factors: factors.map(f => {
            const score = factorScore(f)

            return {
              factor: f.text,
              preventiveControls: f.preventive || undefined,
              lossControls: f.loss || undefined,
              controlsAdequate: adequacyLabel(f.adequacy) || undefined,
              likelihood: ratingText('likelihood', f.likelihood),
              impact: ratingText('impact', f.impact),
              score,
              level: score === undefined ? undefined : riskLevel(score).name,
              residualInternal: f.internal || undefined,
              residualExternal: f.external || undefined
            }
          })
        }
      })
    )
  }
})
