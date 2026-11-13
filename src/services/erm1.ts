// ERM1 — กระบวนการดำเนินงาน(หลัก) under each เป้าประสงค์, and the PESTEL / 7S / Situation / Key Risks
// analysis of each process. Storage: data/erm1.json via jsonStore. To move to the real backend,
// reimplement the exported functions.
import 'server-only'

import { ServiceError, jsonStore } from '@/libs/jsonStore'
import type { Caller } from '@/mcp/types'

import type { Erm1Analysis, Erm1Tree, KeyRisk, ProcessRecord } from './erm1Types'
import { listGoals } from './goals'
import { listSo, sameScope } from './so'

const store = jsonStore<ProcessRecord>('erm1')

const notFound = () => new ServiceError('ไม่พบกระบวนการนี้ อาจถูกลบไปแล้ว', 404)

/** SO › goals › processes of a year + unit, everything the ERM1 page needs in one call. */
export const listErm1 = async (year: number, unit: string): Promise<Erm1Tree> => {
  const [so, goals, rows] = await Promise.all([listSo(year, unit), listGoals(year, unit), store.load()])

  return {
    so,
    goals,
    processes: rows.filter(r => sameScope(r, year, unit)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }
}

export const getProcess = async (id: string) => (await store.load()).find(r => r.id === id)

export const countProcessesOfGoal = async (goalId: string) =>
  (await store.load()).filter(r => r.goalId === goalId).length

export type ProcessInput = { year: number; unit: string; goalId: string; name: string }

export const createProcess = async (caller: Caller, input: ProcessInput) => {
  if (!(await listGoals(input.year, input.unit)).some(g => g.id === input.goalId))
    throw new ServiceError('ไม่พบเป้าประสงค์ที่เลือกในปีและหน่วยงานนี้', 400)

  return store.mutate(rows => {
    if (rows.some(r => r.goalId === input.goalId && r.name === input.name))
      throw new ServiceError('มีกระบวนการชื่อนี้อยู่แล้วในเป้าประสงค์นี้', 409)

    const now = new Date().toISOString()

    const rec: ProcessRecord = {
      ...input,
      id: crypto.randomUUID(),
      pestel: {},
      sevenS: {},
      situation: '',
      keyRisks: [],
      createdAt: now,
      updatedAt: now,
      createdBy: caller.userId
    }

    rows.push(rec)

    return rec
  })
}

export type ProcessPatch = Partial<Omit<Erm1Analysis, 'keyRisks'>> & {
  name?: string
  keyRisks?: (Omit<KeyRisk, 'id'> & { id?: string })[]
}

const dropEmpty = <T extends Record<string, string | undefined>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v?.trim())) as Partial<T>

/** Rename and/or save any of the analysis sections. Sections left out stay as they are. */
export const updateProcess = (_caller: Caller, id: string, patch: ProcessPatch) =>
  store.mutate(rows => {
    const rec = rows.find(r => r.id === id)

    if (!rec) throw notFound()
    if (patch.name && rows.some(r => r.id !== id && r.goalId === rec.goalId && r.name === patch.name))
      throw new ServiceError('มีกระบวนการชื่อนี้อยู่แล้วในเป้าประสงค์นี้', 409)

    const before = structuredClone(rec)

    if (patch.name !== undefined) rec.name = patch.name
    if (patch.pestel) rec.pestel = dropEmpty(patch.pestel)
    if (patch.sevenS) rec.sevenS = dropEmpty(patch.sevenS)
    if (patch.situation !== undefined) rec.situation = patch.situation
    if (patch.keyRisks) rec.keyRisks = patch.keyRisks.map(k => ({ ...k, id: k.id ?? crypto.randomUUID() }))
    rec.updatedAt = new Date().toISOString()

    return { rec, before }
  })

export const deleteProcess = (_caller: Caller, id: string) =>
  store.mutate(rows => {
    const i = rows.findIndex(r => r.id === id)

    if (i < 0) throw notFound()

    return rows.splice(i, 1)[0]
  })

/** The process that holds this Key Risk, with the risk itself. */
export const findKeyRisk = async (keyRiskId: string) => {
  for (const p of await store.load()) {
    const risk = p.keyRisks.find(k => k.id === keyRiskId)

    if (risk) return { process: p, risk }
  }

  return undefined
}
