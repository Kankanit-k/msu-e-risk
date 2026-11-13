// Mock data for the risk overview dashboard (ported from html/index.html).
// Fictional and deterministic per fiscal year — replace with real services once the backend exists.

export const UNITS = [
  'คณะวิทยาศาสตร์',
  'คณะวิศวกรรมศาสตร์',
  'คณะแพทยศาสตร์',
  'คณะพยาบาลศาสตร์',
  'คณะศึกษาศาสตร์',
  'คณะการบัญชีและการจัดการ',
  'คณะมนุษยศาสตร์และสังคมศาสตร์',
  'คณะเทคโนโลยี',
  'สำนักคอมพิวเตอร์',
  'สำนักวิทยบริการ',
  'กองคลัง',
  'กองบริหารงานบุคคล',
  'กองกิจการนิสิต',
  'กองอาคารสถานที่'
]

export const CATS = [
  { name: 'กลยุทธ์', color: '#6D4CFF' },
  { name: 'การดำเนินงาน', color: '#16A3A3' },
  { name: 'การเงิน', color: '#F2B33D' },
  { name: 'กฎระเบียบ', color: '#1E6FD9' },
  { name: 'เทคโนโลยีสารสนเทศ', color: '#E5266E' },
  { name: 'ชื่อเสียงองค์กร', color: '#8A5A33' }
]

const RISK_TEMPLATES: [number, string][] = [
  [0, 'จำนวนนิสิตใหม่ต่ำกว่าแผนรับ'],
  [0, 'หลักสูตรไม่ตอบโจทย์ตลาดแรงงาน'],
  [0, 'ผลงานวิจัยตีพิมพ์ไม่ถึงเป้าหมาย'],
  [1, 'บุคลากรสายวิชาการลาออก/เกษียณโดยไม่มีผู้ทดแทน'],
  [1, 'อุบัติเหตุในห้องปฏิบัติการ'],
  [1, 'ครุภัณฑ์การเรียนการสอนชำรุดหรือล้าสมัย'],
  [1, 'การจัดซื้อจัดจ้างล่าช้ากว่าแผน'],
  [2, 'รายได้ค่าธรรมเนียมการศึกษาลดลง'],
  [2, 'การเบิกจ่ายงบประมาณไม่เป็นไปตามแผน'],
  [2, 'ค่าสาธารณูปโภคสูงกว่างบประมาณ'],
  [3, 'การปฏิบัติไม่สอดคล้องกับ พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล'],
  [3, 'หลักสูตรไม่ผ่านเกณฑ์มาตรฐาน อว.'],
  [3, 'การจัดซื้อไม่เป็นไปตาม พ.ร.บ.จัดซื้อจัดจ้างฯ'],
  [4, 'ระบบสารสนเทศหลักหยุดชะงัก'],
  [4, 'ถูกโจมตีทางไซเบอร์/ข้อมูลรั่วไหล'],
  [4, 'ระบบ e-Learning รองรับผู้ใช้ไม่เพียงพอ'],
  [5, 'ข่าวเชิงลบในสื่อสังคมออนไลน์'],
  [5, 'ข้อร้องเรียนด้านคุณภาพการให้บริการนิสิต']
]

const OWNERS = [
  'รองคณบดีฝ่ายบริหาร',
  'รองคณบดีฝ่ายวิชาการ',
  'หัวหน้าสำนักงาน',
  'ผู้อำนวยการกอง',
  'หัวหน้างานพัสดุ',
  'หัวหน้างานการเงิน',
  'หัวหน้างานเทคโนโลยีสารสนเทศ'
]

const MEASURES = [
  'ทบทวนและปรับปรุงคู่มือปฏิบัติงาน',
  'จัดอบรมบุคลากรที่เกี่ยวข้อง',
  'ติดตั้งระบบเฝ้าระวังและแจ้งเตือน',
  'จัดทำแผนสำรองและซ้อมแผน',
  'ปรับกระบวนการและกำหนดผู้รับผิดชอบชัดเจน'
]

type KriTemplate = { name: string; unit: string; thr: number; dir: 'min' | 'max' }

const KRI_TEMPLATES: KriTemplate[] = [
  { name: 'อัตรานิสิตใหม่เทียบแผนรับ', unit: '%', thr: 90, dir: 'min' },
  { name: 'ร้อยละการเบิกจ่ายงบประมาณ', unit: '%', thr: 70, dir: 'min' },
  { name: 'จำนวนครั้งที่ระบบหลักล่ม', unit: 'ครั้ง', thr: 2, dir: 'max' },
  { name: 'บุคลากรผ่านการอบรม PDPA', unit: '%', thr: 80, dir: 'min' },
  { name: 'จำนวนข้อร้องเรียนจากนิสิต', unit: 'เรื่อง', thr: 5, dir: 'max' },
  { name: 'อัตราการคงอยู่ของนิสิตชั้นปีที่ 1', unit: '%', thr: 85, dir: 'min' },
  { name: 'อุบัติเหตุในห้องปฏิบัติการ', unit: 'ครั้ง', thr: 1, dir: 'max' },
  { name: 'โครงการจัดซื้อที่ล่าช้า', unit: '%', thr: 10, dir: 'max' }
]

// Fiscal year runs 1 Oct – 30 Sep. Rounds follow Design/Workflow-e-Risk.png.
export const ROUNDS = [
  { label: 'วางแผน', short: 'วางแผน', due: (y: number) => `30 พ.ย. ${y - 1}` },
  { label: '6 เดือน', short: '6 ด.', due: (y: number) => `20 มี.ค. ${y}` },
  { label: '9 เดือน', short: '9 ด.', due: (y: number) => `19 มิ.ย. ${y}` },
  { label: '12 เดือน', short: '12 ด.', due: (y: number) => `28 ก.ย. ${y}` }
]

export const YEARS = [2568, 2569, 2570]

export type StatusKey = 'closed' | 'none' | 'draft' | 'head' | 'back' | 'plan' | 'ok'

export const STATUS: Record<StatusKey, { label: string; bg: string; fg: string }> = {
  closed: { label: 'ยังไม่เปิด', bg: 'transparent', fg: 'var(--mui-palette-text-disabled)' },
  none: { label: 'ยังไม่เริ่ม', bg: 'var(--mui-palette-action-selected)', fg: 'var(--mui-palette-text-secondary)' },
  draft: { label: 'ร่าง', bg: '#DCEBFF', fg: '#1553A8' },
  head: { label: 'รอหัวหน้าเห็นชอบ', bg: '#FFF1D6', fg: '#A66A00' },
  back: { label: 'ตีกลับแก้ไข', bg: '#FFE0E8', fg: '#B81A55' },
  plan: { label: 'รอกองแผนรับรอง', bg: '#ECE6FF', fg: '#4B2FD1' },
  ok: { label: 'รับรองแล้ว', bg: '#DDF5EA', fg: '#137A55' }
}

export type Risk = {
  id: string
  name: string
  cat: number
  unit: string
  ui: number
  owner: string
  measure: string
  L: number
  I: number
  dL: number
  dI: number
  worsen: boolean
  speed: number
}

export type KriLevel = 'RED' | 'AMBER' | 'GREEN'
type KriDef = KriTemplate & { unitName: string; ui: number; base: number; drift: number }
export type Kri = KriDef & { v: number; st: KriLevel }
export type UnitRow = { name: string; ui: number; st: StatusKey; all: StatusKey[] }

// mulberry32 — small seeded PRNG so every year renders the same numbers on every load
const prng = (seed: number) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)

  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// Fisher–Yates with the seeded PRNG. (A random sort comparator is engine-dependent and breaks hydration.)
const shuffle = <T>(arr: T[], r: () => number) => {
  const a = [...arr]

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))

    ;[a[i], a[j]] = [a[j], a[i]]
  }

  return a
}

const cache: Record<number, { risks: Risk[]; kris: KriDef[] }> = {}

export const yearData = (year: number) => {
  if (cache[year]) return cache[year]

  const r = prng(year)
  const risks: Risk[] = []
  const kris: KriDef[] = []
  let seq = 1

  UNITS.forEach((unit, ui) => {
    const pool = shuffle(RISK_TEMPLATES, r).slice(0, 5 + Math.floor(r() * 5))

    pool.forEach(([cat, name]) => {
      risks.push({
        id: `RSK-${String(year).slice(2)}-${String(seq++).padStart(3, '0')}`,
        name,
        cat,
        unit,
        ui,
        owner: OWNERS[Math.floor(r() * OWNERS.length)],
        L: 2 + Math.floor(r() * 4),
        I: 2 + Math.floor(r() * 4),
        dL: Math.floor(r() * 3),
        dI: Math.floor(r() * 2),
        worsen: r() < 0.1,
        speed: 0.55 + r() * 0.7,
        measure: MEASURES[Math.floor(r() * MEASURES.length)]
      })
    })
    shuffle(KRI_TEMPLATES, r)
      .slice(0, 1 + Math.floor(r() * 2))
      .forEach(t => kris.push({ ...t, unitName: unit, ui, base: r(), drift: r() * 0.3 - 0.15 }))
  })

  return (cache[year] = { risks, kris })
}

export const residual = (k: Risk, round: number) =>
  k.worsen
    ? { L: Math.min(5, k.L + (round >= 2 ? 1 : 0)), I: k.I }
    : {
        L: Math.max(1, k.L - Math.round((k.dL * (round + 1)) / 4)),
        I: Math.max(1, k.I - Math.round((k.dI * (round + 1)) / 4))
      }

export const scoreAt = (k: Risk, round: number) => {
  const x = residual(k, round)

  return x.L * x.I
}

export const progress = (k: Risk, round: number) => Math.min(100, Math.round(((round + 1) / 4) * 100 * k.speed))
export const delayed = (k: Risk, round: number) => progress(k, round) < ((round + 1) / 4) * 100 - 10

export const trend = (k: Risk, round: number) =>
  Math.sign(scoreAt(k, round) - (round ? scoreAt(k, round - 1) : k.L * k.I))

export const level = (s: number) =>
  s <= 4
    ? { name: 'ต่ำ', color: '#22B07D' }
    : s <= 9
      ? { name: 'ปานกลาง', color: '#F2B33D' }
      : s <= 15
        ? { name: 'สูง', color: '#F27A1F' }
        : { name: 'สูงมาก', color: '#E5266E' }

export const LEVELS = [
  { label: 'ต่ำ 1–4', color: '#22B07D' },
  { label: 'ปานกลาง 5–9', color: '#F2B33D' },
  { label: 'สูง 10–15', color: '#F27A1F' },
  { label: 'สูงมาก 16–25', color: '#E5266E' }
]

export const KRI_COLOR: Record<KriLevel, string> = { RED: '#E5266E', AMBER: '#F2B33D', GREEN: '#22B07D' }

export const kriValue = (k: KriDef, round: number) => {
  const v =
    k.dir === 'min'
      ? k.thr * (0.82 + k.base * 0.3 + (k.drift * round) / 3)
      : k.thr * (0.4 + k.base * 1.0 + k.drift * round)

  return k.unit === '%' ? Math.round(v * 10) / 10 : Math.max(0, Math.round(v))
}

export const kriStatus = (k: KriTemplate, v: number): KriLevel => {
  if (k.dir === 'min') return v < k.thr ? 'RED' : v < k.thr * 1.06 ? 'AMBER' : 'GREEN'

  return v > k.thr ? 'RED' : v >= k.thr * 0.8 && v > 0 ? 'AMBER' : 'GREEN'
}

const unitStatus = (year: number, round: number, ui: number, sel: number): StatusKey => {
  if (round > sel) return 'closed'
  if (round < sel) return 'ok'
  const x = prng(year * 1000 + round * 97 + ui * 13)()

  return x < 0.3 ? 'ok' : x < 0.5 ? 'plan' : x < 0.65 ? 'head' : x < 0.75 ? 'back' : x < 0.9 ? 'draft' : 'none'
}

export type Filter = { year: number; round: number; unit: number | null }

/** Everything the dashboard shows, derived from the filters. */
export const buildView = ({ year, round, unit }: Filter) => {
  const d = yearData(year)
  const inUnit = (x: { ui: number }) => unit === null || x.ui === unit

  const kris: Kri[] = d.kris.filter(inUnit).map(k => {
    const v = kriValue(k, round)

    return { ...k, v, st: kriStatus(k, v) }
  })

  const units: UnitRow[] = UNITS.map((name, ui) => ({ name, ui }))
    .filter(inUnit)
    .map(u => ({
      ...u,
      st: unitStatus(year, round, u.ui, round),
      all: ROUNDS.map((_, ri) => unitStatus(year, ri, u.ui, round))
    }))

  return { year, round, unit, risks: d.risks.filter(inUnit), kris, units }
}

export type DashView = ReturnType<typeof buildView>
