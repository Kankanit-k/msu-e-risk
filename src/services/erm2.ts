// ERM2 — risk factors of each Key Risk from ERM1, with existing controls, initial L × I and residual risk.
// Storage: data/erm2.json via jsonStore, one record per Key Risk. To move to the real backend, reimplement the
// exported functions.
import 'server-only'

import { ServiceError, jsonStore } from '@/libs/jsonStore'
import type { Caller } from '@/mcp/types'

import { findKeyRisk, listErm1 } from './erm1'
import type { Erm2Record, Erm2Tree, RiskFactor } from './erm2Types'
import { sameScope } from './so'

const store = jsonStore<Erm2Record>('erm2')

/** Everything the ERM2 page needs: SO › goals › processes (with Key Risks) plus the ERM2 of each Key Risk. */
export const listErm2 = async (year: number, unit: string): Promise<Erm2Tree> => {
  const [tree, rows] = await Promise.all([listErm1(year, unit), store.load()])
  const riskIds = new Set(tree.processes.flatMap(p => p.keyRisks.map(k => k.id)))

  return { ...tree, erm2: rows.filter(r => sameScope(r, year, unit) && riskIds.has(r.keyRiskId)) }
}

export type FactorInput = Omit<RiskFactor, 'id'> & { id?: string }

/** Replace the whole factor list of one Key Risk. New factors get an id; kept ones keep theirs. */
export const saveErm2 = async (caller: Caller, keyRiskId: string, factors: FactorInput[]) => {
  const found = await findKeyRisk(keyRiskId)

  if (!found) throw new ServiceError('ไม่พบความเสี่ยงนี้ใน ERM1 อาจถูกลบไปแล้ว', 404)

  const { process } = found

  return store.mutate(rows => {
    const i = rows.findIndex(r => r.keyRiskId === keyRiskId)
    const before = i >= 0 ? structuredClone(rows[i]) : undefined
    const known = new Set(before?.factors.map(f => f.id))

    const rec: Erm2Record = {
      keyRiskId,
      processId: process.id,
      year: process.year,
      unit: process.unit,
      factors: factors.map(f => ({ ...f, id: f.id && known.has(f.id) ? f.id : crypto.randomUUID() })),
      updatedAt: new Date().toISOString(),
      updatedBy: caller.userId
    }

    if (i >= 0) rows[i] = rec
    else rows.push(rec)

    return { rec, before }
  })
}

/** The ERM2 record that holds this risk factor, with the factor itself. */
export const findFactor = async (factorId: string) => {
  for (const rec of await store.load()) {
    const factor = rec.factors.find(f => f.id === factorId)

    if (factor) return { rec, factor }
  }

  return undefined
}
