// เป้าประสงค์ (goals) — data layer for /risk/goals. Every goal belongs to one SO of the same year + unit.
// Storage: data/goals.json via jsonStore. To move to the real backend, reimplement the exported functions.
import 'server-only'

import { ServiceError, jsonStore } from '@/libs/jsonStore'
import { fetchPmsGoals } from '@/libs/pms'
import type { Caller } from '@/mcp/types'

import { assertCanPull, assertCanType, byCode, listSo, sameCode, sameScope } from './so'
import type { GoalInput, GoalRecord, GoalRow, ImportResult, PmsItem, SoRecord } from './strategyTypes'

const store = jsonStore<GoalRecord>('goals')

const withSo = (goals: GoalRecord[], so: SoRecord[]): GoalRow[] =>
  goals
    .map(gl => {
      const s = so.find(x => x.id === gl.soId)

      return { ...gl, soCode: s?.code ?? '—', soName: s?.name ?? 'ไม่พบ SO (อาจถูกลบไปแล้ว)' }
    })
    .sort((a, b) => byCode({ code: a.soCode }, { code: b.soCode }) || byCode(a, b))

/** Goals of a year + unit, optionally only those under one SO. */
export const listGoals = async (year: number, unit: string, soId?: string) => {
  const [rows, so] = await Promise.all([store.load(), listSo(year, unit)])

  return withSo(
    rows.filter(r => sameScope(r, year, unit) && (!soId || r.soId === soId)),
    so
  )
}

export const countGoalsOfSo = async (soId: string) => (await store.load()).filter(r => r.soId === soId).length

const assertSo = async (input: GoalInput) => {
  const so = (await listSo(input.year, input.unit)).find(s => s.id === input.soId)

  if (!so) throw new ServiceError('ไม่พบวัตถุประสงค์เชิงกลยุทธ์ที่เลือกในปีและหน่วยงานนี้', 400)
}

const assertCodeFree = (rows: GoalRecord[], input: GoalInput, exceptId?: string) => {
  if (rows.some(r => r.id !== exceptId && sameScope(r, input.year, input.unit) && sameCode(r.code, input.code)))
    throw new ServiceError(`รหัสเป้าประสงค์ ${input.code} มีอยู่แล้วในปี ${input.year} ของหน่วยงานนี้`, 409)
}

export const createGoal = async (caller: Caller, input: GoalInput) => {
  assertCanType('เป้าประสงค์')
  await assertSo(input)

  return store.mutate(rows => {
    assertCodeFree(rows, input)
    const now = new Date().toISOString()

    const rec: GoalRecord = {
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

export const updateGoal = async (_caller: Caller, id: string, input: Pick<GoalInput, 'soId' | 'code' | 'name'>) => {
  assertCanType('เป้าประสงค์')
  const current = (await store.load()).find(r => r.id === id)

  if (!current) throw new ServiceError('ไม่พบรายการนี้ อาจถูกลบไปแล้ว', 404)
  if (current.source === 'pms') throw new ServiceError('เป้าประสงค์ที่ดึงจาก PMS ต้องแก้ไขที่ระบบ PMS', 403)
  await assertSo({ ...current, ...input })

  return store.mutate(rows => {
    const rec = rows.find(r => r.id === id)

    if (!rec) throw new ServiceError('ไม่พบรายการนี้ อาจถูกลบไปแล้ว', 404)
    assertCodeFree(rows, { ...rec, ...input }, id)

    const before = { ...rec }

    Object.assign(rec, input, { updatedAt: new Date().toISOString() })

    return { rec, before }
  })
}

export const deleteGoal = (_caller: Caller, id: string) =>
  store.mutate(rows => {
    const i = rows.findIndex(r => r.id === id)

    if (i < 0) throw new ServiceError('ไม่พบรายการนี้ อาจถูกลบไปแล้ว', 404)

    return rows.splice(i, 1)[0]
  })

// A PMS goal maps to the local SO imported from the same PMS SO, else to a local SO with the same code.
const localSoFor = (so: SoRecord[], x: { soPmsId: string; soCode: string }) =>
  so.find(s => s.pmsId && s.pmsId === x.soPmsId) ?? so.find(s => sameCode(s.code, x.soCode))

/** Goals in PMS for this year + unit, flagged when imported, or blocked when their SO is not here yet. */
export const listPmsGoals = async (year: number, unit: string): Promise<{ items: PmsItem[]; mock: boolean }> => {
  assertCanPull()

  const [{ items, mock }, rows, so] = await Promise.all([fetchPmsGoals(year, unit), store.load(), listSo(year, unit)])

  const have = new Set(
    rows
      .filter(r => sameScope(r, year, unit))
      .map(r => r.pmsId)
      .filter(Boolean)
  )

  return {
    mock,
    items: items.map(x => ({
      pmsId: x.pmsId,
      code: x.code,
      name: x.name,
      soCode: x.soCode,
      imported: have.has(x.pmsId),
      blockedReason: localSoFor(so, x) ? undefined : `ต้องนำเข้า ${x.soCode} ที่หน้า SO ก่อน`
    }))
  }
}

export const importGoalsFromPms = async (
  caller: Caller,
  year: number,
  unit: string,
  pmsIds: string[]
): Promise<ImportResult> => {
  assertCanPull()

  const [{ items }, so] = await Promise.all([fetchPmsGoals(year, unit), listSo(year, unit)])
  const chosen = items.filter(x => pmsIds.includes(x.pmsId))

  return store.mutate(rows => {
    const now = new Date().toISOString()
    const added: GoalRecord[] = []
    const skipped: string[] = []

    for (const x of chosen) {
      const parent = localSoFor(so, x)
      const taken = rows.some(r => sameScope(r, year, unit) && (r.pmsId === x.pmsId || sameCode(r.code, x.code)))

      if (!parent || taken) {
        skipped.push(x.code)
        continue
      }

      const rec: GoalRecord = {
        id: crypto.randomUUID(),
        year,
        unit,
        soId: parent.id,
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

/** Copy the most recent earlier year's goals; each needs an SO with the same code in `year` already. */
export const importGoalsFromLastYear = async (caller: Caller, year: number, unit: string): Promise<ImportResult> => {
  const all = await store.load()
  const prevYear = Math.max(...all.filter(r => r.unit === unit && r.year < year).map(r => r.year), -Infinity)

  if (!Number.isFinite(prevYear)) throw new ServiceError('ไม่พบข้อมูลเป้าประสงค์ของปีก่อนหน้าสำหรับหน่วยงานนี้', 404)

  const [prevSo, thisSo] = await Promise.all([listSo(prevYear, unit), listSo(year, unit)])

  return store.mutate(rows => {
    const now = new Date().toISOString()
    const added: GoalRecord[] = []
    const skipped: string[] = []

    for (const r of rows.filter(r => sameScope(r, prevYear, unit))) {
      const oldSo = prevSo.find(s => s.id === r.soId)
      const newSo = oldSo && thisSo.find(s => sameCode(s.code, oldSo.code))

      if (!newSo || rows.some(x => sameScope(x, year, unit) && sameCode(x.code, r.code))) {
        skipped.push(r.code)
        continue
      }

      added.push({
        ...r,
        id: crypto.randomUUID(),
        year,
        soId: newSo.id,
        createdAt: now,
        updatedAt: now,
        createdBy: caller.userId
      })
    }

    rows.push(...added)

    return { added, skipped, fromYear: prevYear }
  })
}
