// ERM3 (แผนบริหารจัดการความเสี่ยง / Risk Management Plan) — one per risk factor of ERM2.
// Shared types and helpers, safe to import from client code.
import type { Erm2Tree, Scored } from './erm2Types'

export const CONTROL_KINDS = [
  { key: 'preventive', label: 'Additional Preventive Controls (การควบคุมเชิงป้องกัน)' },
  { key: 'corrective', label: 'Corrective/Loss Controls (การควบคุมเชิงการแก้ไข/การสูญเสีย)' }
] as const

export type ControlKind = (typeof CONTROL_KINDS)[number]['key']

// Only "measure" items are reported on in ERM4; headings only group them (manual p10).
export const MEASURE_TYPES = [
  { key: 'heading', label: 'หัวข้อ' },
  { key: 'subheading', label: 'หัวข้อย่อย' },
  { key: 'measure', label: 'มาตรการ/แผนงาน/โครงการ/กิจกรรม' }
] as const

export type MeasureType = (typeof MEASURE_TYPES)[number]['key']

export type Measure = { id: string; control: ControlKind; type: MeasureType; text: string }

// ⚠️ The old system's "ประเภทเกณฑ์ตัวชี้วัด" options are not visible in the manual. Assumed to be the direction
// used to decide "บรรลุ/ไม่บรรลุ" in ERM4 — confirm with กองแผนงาน.
export const TARGET_DIRECTIONS = [
  { key: 'atLeast', label: 'ผลยิ่งมากยิ่งดี (บรรลุเมื่อ ≥ เป้าหมาย)' },
  { key: 'atMost', label: 'ผลยิ่งน้อยยิ่งดี (บรรลุเมื่อ ≤ เป้าหมาย)' }
] as const

export type TargetDirection = (typeof TARGET_DIRECTIONS)[number]['key']

/** KPI or Leading KRI: name, detail, target with its unit, and a 5-level criteria table (index 0 = level 1). */
export type Indicator = {
  id: string
  name: string
  detail: string
  direction: TargetDirection
  target?: number
  unit: string
  levels: { criterion: string; note: string }[]
}

export type Erm3Record = {
  factorId: string
  keyRiskId: string
  year: number
  unit: string
  measures: Measure[]
  kpis: Indicator[]
  kris: Indicator[]
  expected: Scored
  start?: string // yyyy-mm-dd
  end?: string
  supervisors: string[]
  owners: string[]
  updatedAt: string
  updatedBy: string
}

export type Erm3Input = Omit<Erm3Record, 'factorId' | 'keyRiskId' | 'year' | 'unit' | 'updatedAt' | 'updatedBy'>

export type Erm3Tree = Erm2Tree & { erm3: Erm3Record[] }

export const INDICATOR_KINDS = {
  kpis: {
    short: 'KPI',
    title: 'ตัวชี้วัดความสำเร็จมาตรการ/แผนงาน/โครงการ/กิจกรรมจัดการความเสี่ยง (KPI)',
    name: 'ตัวชี้วัดความสำเร็จ (KPI)',
    target: 'เป้าหมายตัวชี้วัดความสำเร็จ (KPI)'
  },
  kris: {
    short: 'KRIs',
    title: 'ตัวชี้วัดเตือนภัยความเสี่ยง (Leading KRIs)',
    name: 'ตัวชี้วัดเตือนภัยความเสี่ยง (Leading KRIs)',
    target: 'เป้าหมายตัวชี้วัดความเสี่ยง (Leading KRIs)'
  }
} as const

export type IndicatorKind = keyof typeof INDICATOR_KINDS

// Suggestions for "ผู้กำกับดูแลและรับผิดชอบหลัก" (free text allowed), from the old system's list.
export const SUPERVISOR_SUGGESTIONS = [
  'อธิการบดี',
  'รองอธิการบดี',
  'คณบดี',
  'รองคณบดี',
  'ผู้อำนวยการกอง',
  'ผู้ช่วยผู้อำนวยการกอง',
  'หัวหน้างาน'
]

export const ERM3_STEPS = [
  'มาตรการ (Addition Risk Treatment)',
  'ตัวชี้วัดความสำเร็จมาตรการ (KPI)',
  'ตัวชี้วัดความเสี่ยง (Leading KRIs)',
  'ระดับความเสี่ยงที่คาดหวังตามมาตรการ',
  'ระยะเวลาดำเนินการ',
  'ผู้รับผิดชอบ',
  'รายงาน'
]

/** Which of the 6 input steps are filled. */
export const erm3StepsDone = (r?: Erm3Record) => [
  !!r?.measures.some(m => m.type === 'measure'),
  !!r?.kpis.length,
  !!r?.kris.length,
  !!(r?.expected.likelihood && r.expected.impact),
  !!(r?.start && r.end),
  !!(r?.supervisors.length || r?.owners.length)
]

export const thaiLongDate = (ymd?: string) =>
  ymd
    ? new Date(`${ymd}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-'

export const periodText = (r?: Pick<Erm3Record, 'start' | 'end'>) =>
  r?.start || r?.end ? `${thaiLongDate(r?.start)} - ${thaiLongDate(r?.end)}` : '-'

/** "75 ร้อยละ" / "-" */
export const targetText = (i: Indicator) => (i.target === undefined ? '-' : `${i.target} ${i.unit}`.trim())

/** Items of one control kind with their indent and the running number of each reportable measure. */
export const outlineOf = (items: Measure[], control: ControlKind) => {
  let n = 0
  let depth = 0

  return items
    .filter(m => m.control === control)
    .map(m => {
      if (m.type === 'heading') depth = 1
      else if (m.type === 'subheading') depth = 2

      return {
        ...m,
        indent: m.type === 'heading' ? 0 : m.type === 'subheading' ? 1 : depth,
        no: m.type === 'measure' ? ++n : undefined
      }
    })
}
