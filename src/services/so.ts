// SO (วัตถุประสงค์เชิงกลยุทธ์) — data layer for /risk/so.
// Storage: data/so.json via jsonStore. To move to the real backend, reimplement the exported functions;
// the API routes and the page only call these.
import 'server-only'

import { ServiceError, jsonStore } from '@/libs/jsonStore'
import { fetchPmsSo, strategyMode } from '@/libs/pms'
import type { Caller } from '@/mcp/types'

import type { ImportResult, PmsItem, SoInput, SoRecord } from './strategyTypes'

const store = jsonStore<SoRecord>('so')

export const sameScope = (r: { year: number; unit: string }, year: number, unit: string) =>
  r.year === year && r.unit === unit
export const byCode = (a: { code: string }, b: { code: string }) =>
  a.code.localeCompare(b.code, 'th', { numeric: true })
export const sameCode = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export const assertCanType = (what: string) => {
  if (strategyMode() === 'pms')
    throw new ServiceError(`ระบบตั้งค่าให้ใช้${what}จาก PMS เท่านั้น เพิ่มหรือแก้ไขเองไม่ได้`, 403)
}

export const assertCanPull = () => {
  if (strategyMode() === 'manual') throw new ServiceError('ระบบตั้งค่าไม่ให้ดึงข้อมูลจาก PMS', 403)
}

const assertCodeFree = (rows: SoRecord[], input: SoInput, exceptId?: string) => {
  if (rows.some(r => r.id !== exceptId && sameScope(r, input.year, input.unit) && sameCode(r.code, input.code)))
    throw new ServiceError(`รหัส ${input.code} มีอยู่แล้วในปี ${input.year} ของหน่วยงานนี้`, 409)
}

export const listSo = async (year: number, unit: string) =>
  (await store.load()).filter(r => sameScope(r, year, unit)).sort(byCode)

export const getSo = async (id: string) => (await store.load()).find(r => r.id === id)

export const createSo = (caller: Caller, input: SoInput) => {
  assertCanType(' SO ')

  return store.mutate(rows => {
    assertCodeFree(rows, input)
    const now = new Date().toISOString()

    const rec: SoRecord = {
      ...input,
      id: crypto.randomUUID(),
      source: 'manual',
      createdAt: now,
      updatedAt: now,
      createdBy: caller.userId
    }

    rows.push(rec)

    return rec
  })
}

export const updateSo = (_caller: Caller, id: string, input: Pick<SoInput, 'code' | 'name'>) => {
  assertCanType(' SO ')

  return store.mutate(rows => {
    const rec = rows.find(r => r.id === id)

    if (!rec) throw new ServiceError('ไม่พบรายการนี้ อาจถูกลบไปแล้ว', 404)
    if (rec.source === 'pms') throw new ServiceError('SO ที่ดึงจาก PMS ต้องแก้ไขที่ระบบ PMS', 403)
    assertCodeFree(rows, { ...rec, ...input }, id)

    const before = { ...rec }

    Object.assign(rec, input, { updatedAt: new Date().toISOString() })

    return { rec, before }
  })
}

/** The caller checks first that no goal still uses this SO (see services/goals.ts). */
export const deleteSo = (_caller: Caller, id: string) =>
  store.mutate(rows => {
    const i = rows.findIndex(r => r.id === id)

    if (i < 0) throw new ServiceError('ไม่พบรายการนี้ อาจถูกลบไปแล้ว', 404)

    return rows.splice(i, 1)[0]
  })

/** SO in PMS for this year + unit, flagged when already imported here. */
export const listPmsSo = async (year: number, unit: string): Promise<{ items: PmsItem[]; mock: boolean }> => {
  assertCanPull()

  const [{ items, mock }, rows] = await Promise.all([fetchPmsSo(year, unit), listSo(year, unit)])
  const have = new Set(rows.map(r => r.pmsId).filter(Boolean))

  return { items: items.map(x => ({ ...x, imported: have.has(x.pmsId) })), mock }
}

/** Copy the chosen PMS SO into this system. Skips ones already imported or whose code is taken. */
export const importSoFromPms = async (
  caller: Caller,
  year: number,
  unit: string,
  pmsIds: string[]
): Promise<ImportResult> => {
  const { items } = await listPmsSo(year, unit)
  const chosen = items.filter(x => pmsIds.includes(x.pmsId) && !x.imported)

  return store.mutate(rows => {
    const now = new Date().toISOString()
    const added: SoRecord[] = []
    const skipped: string[] = []

    for (const x of chosen) {
      if (rows.some(r => sameScope(r, year, unit) && sameCode(r.code, x.code))) {
        skipped.push(x.code)
        continue
      }

      const rec: SoRecord = {
        id: crypto.randomUUID(),
        year,
        unit,
        code: x.code,
        name: x.name,
        source: 'pms',
        pmsId: x.pmsId,
        createdAt: now,
        updatedAt: now,
        createdBy: caller.userId
      }

      rows.push(rec)
      added.push(rec)
    }

    return { added, skipped }
  })
}

/** "นำเข้าจากปีล่าสุด": copy the most recent earlier year's SO of this unit into `year`. */
export const importSoFromLastYear = (caller: Caller, year: number, unit: string): Promise<ImportResult> =>
  store.mutate(rows => {
    const prevYear = Math.max(...rows.filter(r => r.unit === unit && r.year < year).map(r => r.year), -Infinity)

    if (!Number.isFinite(prevYear)) throw new ServiceError('ไม่พบข้อมูล SO ของปีก่อนหน้าสำหรับหน่วยงานนี้', 404)

    const now = new Date().toISOString()
    const added: SoRecord[] = []
    const skipped: string[] = []

    for (const r of rows.filter(r => sameScope(r, prevYear, unit))) {
      if (rows.some(x => sameScope(x, year, unit) && sameCode(x.code, r.code))) {
        skipped.push(r.code)
        continue
      }

      added.push({ ...r, id: crypto.randomUUID(), year, createdAt: now, updatedAt: now, createdBy: caller.userId })
    }

    rows.push(...added)

    return { added, skipped, fromYear: prevYear }
  })
