// ERM2 (ปัจจัยเสี่ยง, การควบคุมที่มีอยู่, ระดับความเสี่ยง ณ เริ่มต้น, ความเสี่ยงที่เหลืออยู่) — shared types and
// helpers, safe to import from client code.
import { IMPACT_CRITERIA, LIKELIHOOD_CRITERIA, SCORE_LABEL } from '@/configs/riskCriteria'
import type { Criterion } from '@/configs/riskCriteria'

import type { Erm1Tree } from './erm1Types'

export const ADEQUACY = [
  { key: 'enough', label: 'เพียงพอ' },
  { key: 'notEnough', label: 'ไม่เพียงพอ' }
] as const

export type Adequacy = (typeof ADEQUACY)[number]['key']

export const adequacyLabel = (k?: string) => ADEQUACY.find(a => a.key === k)?.label ?? ''

/** A score 1–5 picked through one criterion of riskCriteria.ts. */
export type Rating = { criterion: string; score: number }

/** สาเหตุความเสี่ยง/ปัจจัยเสี่ยง with its ERM2 assessment. Its id stays stable so ERM3 can point at it. */
export type RiskFactor = {
  id: string
  text: string
  preventive: string
  loss: string
  adequacy?: Adequacy
  likelihood?: Rating
  impact?: Rating
  internal: string
  external: string
}

/** ERM2 of one Key Risk (from ERM1). */
export type Erm2Record = {
  keyRiskId: string
  processId: string
  year: number
  unit: string
  factors: RiskFactor[]
  updatedAt: string
  updatedBy: string
}

export type Erm2Tree = Erm1Tree & { erm2: Erm2Record[] }

// Level bands are still an assumption (manual confirms only 10 and 12 = สูง) — confirm with กองแผนงาน.
export const RISK_LEVELS = [
  { max: 4, name: 'ต่ำ', color: '#22B07D', text: '#fff' },
  { max: 9, name: 'ปานกลาง', color: '#F5E12A', text: '#000' },
  { max: 15, name: 'สูง', color: '#F27A1F', text: '#fff' },
  { max: 25, name: 'สูงมาก', color: '#E5266E', text: '#fff' }
] as const

export const riskLevel = (score: number) => RISK_LEVELS.find(l => score <= l.max) ?? RISK_LEVELS[3]

const criterionOf = (list: Criterion[], key?: string) => list.find(c => c.key === key)

export const RATING_KINDS = {
  likelihood: { letter: 'L', title: 'โอกาสที่จะเกิดเหตุการณ์ที่เป็นความเสี่ยง (L)', criteria: LIKELIHOOD_CRITERIA },
  impact: { letter: 'I', title: 'ความรุนแรงของผลกระทบต่อองค์กร ( I/C )', criteria: IMPACT_CRITERIA }
} as const

export type RatingKind = keyof typeof RATING_KINDS

/** "2|น้อย" */
export const scoreTag = (score: number) => `${score}|${SCORE_LABEL[score - 1] ?? ''}`

/** "L = 2 = การทบทวนการปฏิบัติงาน/สอนงาน/การฝึกอบรม|ทุก 3 เดือน" (or "L = 0 =" when not rated yet). */
export const ratingText = (kind: RatingKind, r?: Rating) => {
  const k = RATING_KINDS[kind]
  const c = criterionOf(k.criteria as Criterion[], r?.criterion)

  if (!r || !c) return `${k.letter} = 0 =`

  return `${k.letter} = ${r.score} = ${c.label}|${c.options[r.score - 1]}`
}

/** Anything rated L × I: an ERM2 factor (initial), ERM3 (expected) or an ERM4 round (actual). */
export type Scored = { likelihood?: Rating; impact?: Rating }

/** L × I, or undefined until both are rated. */
export const factorScore = (f: Scored) => (f.likelihood && f.impact ? f.likelihood.score * f.impact.score : undefined)

/** "(ระดับความเสี่ยง เริ่มต้น) = 2 x 3 = 6 (ปานกลาง)" */
export const scoreText = (f: Scored, label = 'ระดับความเสี่ยง เริ่มต้น') => {
  const s = factorScore(f)

  return s === undefined
    ? `(${label}) = ยังไม่ได้ประเมิน`
    : `(${label}) = ${f.likelihood!.score} x ${f.impact!.score} = ${s} (${riskLevel(s).name})`
}

/** Which of the 4 input steps are complete for every factor. */
export const stepsDone = (factors: RiskFactor[]) => {
  const all = (ok: (f: RiskFactor) => boolean) => factors.length > 0 && factors.every(ok)

  return [
    factors.length > 0,
    all(f => !!f.adequacy && !!(f.preventive.trim() || f.loss.trim())),
    all(f => factorScore(f) !== undefined),
    all(f => !!(f.internal.trim() || f.external.trim()))
  ]
}

export const CONTROL_HEADINGS = {
  preventive: '1. Existing Preventive Controls (ควบคุมก่อนเกิดเหตุ)',
  loss: '2. Existing Loss Controls (ควบคุมหลังเกิดเหตุ/ลดผลกระทบ)',
  adequacy: '3. การควบคุมที่มีอยู่'
}

export const RESIDUAL_HEADINGS = {
  internal: '1. ปัจจัยภายในที่ยังควบคุมไม่ดีพอ ต้องมีการควบคุมป้องกันเพิ่มเติม',
  external: '2. ปัจจัยภายนอกที่ยังบริหารจัดการไม่ดีพอ ต้องบริหารจัดการเพิ่มเติม'
}

export const REPORT_HEADINGS = [
  'กระบวนการทำงานเพื่อให้บรรลุเป้าหมาย',
  'ความเสี่ยงสำคัญ/Key Risks',
  'สาเหตุความเสี่ยง/ปัจจัยเสี่ยง',
  'การควบคุมที่มีอยู่/กลยุทธ์ที่ใช้ควบคุม',
  'ระดับความเสี่ยง ณ เริ่มต้น',
  'ความเสี่ยงที่เหลืออยู่'
]
