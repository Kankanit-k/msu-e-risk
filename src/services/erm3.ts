// ERM3 — risk management plan of each ERM2 risk factor: measures, KPI, Leading KRIs, expected L × I, period and
// owners. Storage: data/erm3.json via jsonStore, one record per factor. To move to the real backend, reimplement
// the exported functions.
import 'server-only'

import { ServiceError, jsonStore } from '@/libs/jsonStore'
import type { Caller } from '@/mcp/types'

import { findFactor, listErm2 } from './erm2'
import type { Erm3Input, Erm3Record, Erm3Tree } from './erm3Types'
import { sameScope } from './so'

const store = jsonStore<Erm3Record>('erm3')

/** ERM2 tree plus the ERM3 of every factor still in it (plans of deleted factors are left out). */
export const listErm3 = async (year: number, unit: string): Promise<Erm3Tree> => {
  const [tree, rows] = await Promise.all([listErm2(year, unit), store.load()])
  const factorIds = new Set(tree.erm2.flatMap(r => r.factors.map(f => f.id)))

  return { ...tree, erm3: rows.filter(r => sameScope(r, year, unit) && factorIds.has(r.factorId)) }
}

export const getErm3 = async (factorId: string) => (await store.load()).find(r => r.factorId === factorId)

type WithIds<T extends { id: string }> = Omit<T, 'id'> & { id?: string }

export type Erm3SaveInput = Omit<Erm3Input, 'measures' | 'kpis' | 'kris'> & {
  measures: WithIds<Erm3Input['measures'][number]>[]
  kpis: WithIds<Erm3Input['kpis'][number]>[]
  kris: WithIds<Erm3Input['kris'][number]>[]
}

/** Keep ids the record already had (ERM4 results point at them); give new items a fresh id. */
const keepIds = <T extends { id?: string }>(items: T[], known: Set<string>) =>
  items.map(it => ({ ...it, id: it.id && known.has(it.id) ? it.id : crypto.randomUUID() }))

/** Replace the whole ERM3 of one risk factor. */
export const saveErm3 = async (caller: Caller, factorId: string, input: Erm3SaveInput) => {
  const found = await findFactor(factorId)

  if (!found) throw new ServiceError('ไม่พบปัจจัยเสี่ยงนี้ใน ERM2 อาจถูกลบไปแล้ว', 404)

  const { rec: erm2 } = found

  return store.mutate(rows => {
    const i = rows.findIndex(r => r.factorId === factorId)
    const before = i >= 0 ? structuredClone(rows[i]) : undefined
    const ids = (list?: { id: string }[]) => new Set(list?.map(x => x.id))

    const rec: Erm3Record = {
      ...input,
      factorId,
      keyRiskId: erm2.keyRiskId,
      year: erm2.year,
      unit: erm2.unit,
      measures: keepIds(input.measures, ids(before?.measures)) as Erm3Record['measures'],
      kpis: keepIds(input.kpis, ids(before?.kpis)) as Erm3Record['kpis'],
      kris: keepIds(input.kris, ids(before?.kris)) as Erm3Record['kris'],
      updatedAt: new Date().toISOString(),
      updatedBy: caller.userId
    }

    if (i >= 0) rows[i] = rec
    else rows.push(rec)

    return { rec, before }
  })
}
