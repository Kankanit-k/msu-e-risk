// ERM1 (บริบทองค์กร) — shared types and fixed option lists, safe to import from client code.
import type { GoalRow, SoRecord } from './strategyTypes'

export const PESTEL = [
  { key: 'political', label: 'Political', prefix: 'P' },
  { key: 'economic', label: 'Economic', prefix: 'E' },
  { key: 'social', label: 'Social', prefix: 'S' },
  { key: 'technology', label: 'Technology', prefix: 'T' },
  { key: 'environment', label: 'Environment', prefix: 'Env' },
  { key: 'legal', label: 'Legal & Compliance', prefix: 'LC' }
] as const

export const SEVEN_S = [
  { key: 'structure', label: 'Structure' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'system', label: 'System' },
  { key: 'sharedValues', label: 'Shared Values' },
  { key: 'skill', label: 'Skill' },
  { key: 'style', label: 'Style' },
  { key: 'staff', label: 'Staff' }
] as const

// F and C are not visible in the old system's screenshots — confirm the wording with กองแผนงาน.
export const SOFC = [
  { key: 'S', label: 'ความเสี่ยงด้านกลยุทธ์ (Strategic Risks)' },
  { key: 'O', label: 'ความเสี่ยงด้านการปฏิบัติงาน (Operation Risks)' },
  { key: 'F', label: 'ความเสี่ยงด้านการเงิน (Financial Risks)' },
  { key: 'C', label: 'ความเสี่ยงด้านการปฏิบัติตามกฎระเบียบ (Compliance Risks)' }
] as const

export type PestelKey = (typeof PESTEL)[number]['key']
export type SevenSKey = (typeof SEVEN_S)[number]['key']
export type SofcKey = (typeof SOFC)[number]['key']

export const sofcLabel = (k: string) => SOFC.find(s => s.key === k)?.label ?? k

/** One Key Risk. Its id stays stable so ERM2 ("ความเสี่ยงที่ N") can point at it. */
export type KeyRisk = { id: string; text: string; sofc: SofcKey }

/** The 4 analysis steps of one process. Texts are plain text with line breaks. */
export type Erm1Analysis = {
  pestel: Partial<Record<PestelKey, string>>
  sevenS: Partial<Record<SevenSKey, string>>
  situation: string
  keyRisks: KeyRisk[]
}

/** กระบวนการดำเนินงาน(หลัก) — belongs to one goal of the same year + unit, carries its ERM1 analysis. */
export type ProcessRecord = Erm1Analysis & {
  id: string
  year: number
  unit: string
  goalId: string
  name: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export type Erm1Tree = { so: SoRecord[]; goals: GoalRow[]; processes: ProcessRecord[] }

const filled = (o: Record<string, string | undefined>) => Object.values(o).some(v => v?.trim())

/** Which of the 4 input steps have data: PESTEL, 7S, Situation, Key Risks. */
export const stepsDone = (a: Erm1Analysis) => [
  filled(a.pestel),
  filled(a.sevenS),
  !!a.situation.trim(),
  a.keyRisks.length > 0
]

/** The 5 report columns, each a list of {heading, text} blocks. Shared by the screen and Word export. */
export const reportColumns = (a: Erm1Analysis) => [
  {
    title: 'วิเคราะห์ External Environment (PESTEL)',
    blocks: PESTEL.filter(c => a.pestel[c.key]?.trim()).map(c => ({ heading: c.label, text: a.pestel[c.key]! }))
  },
  {
    title: 'วิเคราะห์ Internal Environment (McKinsey 7S model)',
    blocks: SEVEN_S.filter(c => a.sevenS[c.key]?.trim()).map(c => ({ heading: c.label, text: a.sevenS[c.key]! }))
  },
  {
    title: 'Situation Analysis วิเคราะห์แนวโน้มการเปลี่ยนแปลง (Mega Trend/PESTEL) & 7S',
    blocks: a.situation.trim() ? [{ heading: '', text: a.situation }] : []
  },
  {
    title: 'ระบุเหตุการณ์ความเสี่ยง (Key Risks*)',
    blocks: a.keyRisks.map((k, i) => ({ heading: `Key Risks (${i + 1})`, text: k.text }))
  },
  {
    title: 'ระบุประเภทความเสี่ยง (SOFC)',
    blocks: a.keyRisks.map((k, i) => ({ heading: `ประเภทความเสี่ยง (${i + 1})`, text: sofcLabel(k.sofc) }))
  }
]
