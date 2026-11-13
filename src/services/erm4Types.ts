// ERM4 (รายงานผลการดำเนินงานตามแผน ERM3, รอบ 6 / 9 / 12 เดือน) — one record per risk factor per round.
// Shared types and helpers, safe to import from client code.
import type { Scored } from './erm2Types'
import type { Erm3Record, Erm3Tree, Indicator } from './erm3Types'

export const ROUNDS = [6, 9, 12] as const

export type Round = (typeof ROUNDS)[number]

export const roundLabel = (r: Round) => `รอบ ${r} เดือน`

export type MeasureResult = { result: string; percent?: number }
export type IndicatorResult = { detail: string; value?: number }
export type Attachment = { id: string; name: string; type: string; size: number }
export type LinkItem = { label: string; url: string }

export type Erm4Record = {
  factorId: string
  round: Round
  year: number
  unit: string
  measures: Record<string, MeasureResult> // by ERM3 measure id
  kpis: Record<string, IndicatorResult> // by ERM3 KPI id
  kris: Record<string, IndicatorResult> // by ERM3 KRI id
  level: Scored
  links: LinkItem[]
  files: Attachment[]
  updatedAt: string
  updatedBy: string
}

export type Erm4Input = Pick<Erm4Record, 'measures' | 'kpis' | 'kris' | 'level' | 'links' | 'files'>

export type Erm4Tree = Erm3Tree & { erm4: Erm4Record[] }

export const ERM4_TABS = [
  'ผลการดำเนินงานตามมาตรการ/แผนงาน/โครงการ/กิจกรรมจัดการความเสี่ยง',
  'ผลการดำเนินงานตามตัวชี้วัด KPI',
  'ผลการดำเนินงานตามตัวชี้วัด KRIs',
  'ระดับความเสี่ยง ณ รอบ', // + round
  'เอกสารแนบ'
]

// ⚠️ The manual only shows "ยังไม่ได้ดำเนินการ"; the other two states are assumed from ร้อยละ.
export const measureStatus = (r?: MeasureResult) => {
  const p = r?.percent ?? 0

  if (p >= 100) return { label: 'ดำเนินการแล้วเสร็จ', color: 'success' as const }
  if (p > 0) return { label: 'อยู่ระหว่างดำเนินการ', color: 'warning' as const }

  return { label: 'ยังไม่ได้ดำเนินการ', color: 'error' as const }
}

/** Compared with the ERM3 target in the indicator's direction; false until both values exist. */
export const achieved = (i: Indicator, value?: number) =>
  value !== undefined && i.target !== undefined && (i.direction === 'atMost' ? value <= i.target : value >= i.target)

export const MAX_FILES_MB = 15

/** Which of the 4 report tabs are complete for this round (attachments are optional). */
export const erm4TabsDone = (plan?: Erm3Record, rec?: Erm4Record) => {
  const measures = plan?.measures.filter(m => m.type === 'measure') ?? []

  const has = (v?: { result?: string; detail?: string; percent?: number; value?: number }) =>
    !!v && (v.percent !== undefined || v.value !== undefined || !!(v.result || v.detail)?.trim())

  return [
    measures.every(m => has(rec?.measures[m.id])),
    (plan?.kpis ?? []).every(k => rec?.kpis[k.id]?.value !== undefined),
    (plan?.kris ?? []).every(k => rec?.kris[k.id]?.value !== undefined),
    !!(rec?.level.likelihood && rec.level.impact)
  ]
}
