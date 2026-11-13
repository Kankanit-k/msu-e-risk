import { z } from 'zod'

import { UNITS } from '@/configs/units'
import { listErm4 } from '@/services/erm4'
import { factorScore, riskLevel } from '@/services/erm2Types'
import { targetText } from '@/services/erm3Types'
import { ROUNDS, achieved, erm4TabsDone, measureStatus } from '@/services/erm4Types'

import { defineTool } from '../types'

export default defineTool({
  name: 'list_erm4',
  title: 'ERM4 รายงานผลการดำเนินงานรอบ 6/9/12 เดือน',
  description:
    'คืนผลการดำเนินงานตามแผน ERM3 ของแต่ละปัจจัยเสี่ยง แยกรอบ 6 / 9 / 12 เดือน: ร้อยละและสถานะของมาตรการ, ผล KPI และ KRIs เทียบเป้าหมาย (บรรลุ/ไม่บรรลุ), ระดับความเสี่ยง ณ รอบ (L × I) และจำนวนเอกสารแนบ ใช้เมื่อผู้ใช้ถามถึงผลการดำเนินงาน การติดตามความเสี่ยง หรือหน่วยงานที่ยังไม่รายงาน ERM4',
  input: {
    year: z.number().int().min(2500).max(2700).describe('ปีงบประมาณ พ.ศ. เช่น 2569'),
    unit: z
      .enum(UNITS as [string, ...string[]])
      .default(UNITS[0])
      .describe('ชื่อคณะ/หน่วยงาน'),
    round: z
      .union([z.literal(6), z.literal(9), z.literal(12)])
      .optional()
      .describe('รอบ 6, 9 หรือ 12 เดือน (ไม่ระบุ = ทุกรอบ)')
  },
  minRole: 'user',
  kind: 'read',
  handler: async (_caller, { year, unit, round }) => {
    const { processes, erm2, erm3, erm4 } = await listErm4(year, unit)

    return processes.flatMap(p =>
      p.keyRisks.flatMap(k =>
        (erm2.find(r => r.keyRiskId === k.id)?.factors ?? []).map(f => {
          const plan = erm3.find(r => r.factorId === f.id)

          return {
            process: p.name,
            keyRisk: k.text,
            factor: f.text,
            hasErm3Plan: !!plan,
            rounds: ROUNDS.filter(r => !round || r === round).map(r => {
              const rec = erm4.find(x => x.factorId === f.id && x.round === r)

              if (!rec || !plan) return { round: r, reported: false }
              const score = factorScore(rec.level)

              return {
                round: r,
                reported: true,
                complete: erm4TabsDone(plan, rec).every(Boolean),
                measures: plan.measures
                  .filter(m => m.type === 'measure')
                  .map(m => ({
                    measure: m.text,
                    percent: rec.measures[m.id]?.percent,
                    status: measureStatus(rec.measures[m.id]).label
                  })),
                kpis: plan.kpis.map(i => ({
                  name: i.name,
                  target: targetText(i),
                  value: rec.kpis[i.id]?.value,
                  achieved: achieved(i, rec.kpis[i.id]?.value)
                })),
                kris: plan.kris.map(i => ({
                  name: i.name,
                  target: targetText(i),
                  value: rec.kris[i.id]?.value,
                  achieved: achieved(i, rec.kris[i.id]?.value)
                })),
                score,
                level: score === undefined ? undefined : riskLevel(score).name,
                attachments: rec.links.length + rec.files.length
              }
            })
          }
        })
      )
    )
  }
})
