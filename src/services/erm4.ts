// ERM4 — results of the ERM3 plan of each risk factor at 6 / 9 / 12 months. Storage: data/erm4.json via
// jsonStore, one record per factor per round. To move to the real backend, reimplement the exported functions.
import 'server-only'

import { ServiceError, jsonStore } from '@/libs/jsonStore'
import { findUpload } from '@/libs/uploads'
import type { Caller } from '@/mcp/types'

import { findFactor } from './erm2'
import { getErm3, listErm3 } from './erm3'
import { MAX_FILES_MB } from './erm4Types'
import type { Attachment, Erm4Input, Erm4Record, Erm4Tree, Round } from './erm4Types'
import { sameScope } from './so'

const store = jsonStore<Erm4Record>('erm4')

/** ERM3 tree plus every round reported for the factors still in it. */
export const listErm4 = async (year: number, unit: string): Promise<Erm4Tree> => {
  const [tree, rows] = await Promise.all([listErm3(year, unit), store.load()])
  const factorIds = new Set(tree.erm2.flatMap(r => r.factors.map(f => f.id)))

  return { ...tree, erm4: rows.filter(r => sameScope(r, year, unit) && factorIds.has(r.factorId)) }
}

const pick = <T>(byId: Record<string, T>, ids: Set<string>) =>
  Object.fromEntries(Object.entries(byId).filter(([id]) => ids.has(id)))

/**
 * Attachments: ones already on the record stay as they were; new ids must be uploads of this caller, and their
 * name/type/size come from the upload store, never from the client. New files together ≤ MAX_FILES_MB.
 */
const resolveFiles = async (caller: Caller, ids: string[], kept: Attachment[]) => {
  const out: Attachment[] = []
  let added = 0

  for (const id of new Set(ids)) {
    const old = kept.find(f => f.id === id)

    if (old) {
      out.push(old)
      continue
    }

    const meta = (await findUpload(id))?.meta

    if (!meta || meta.owner !== caller.userId) throw new ServiceError('ไม่พบไฟล์แนบที่อัปโหลด กรุณาอัปโหลดใหม่', 400)
    added += meta.size
    out.push({ id: meta.id, name: meta.name, type: meta.type, size: meta.size })
  }

  if (added > MAX_FILES_MB * 1024 * 1024)
    throw new ServiceError(`ไฟล์แนบที่เพิ่มรวมกันเกิน ${MAX_FILES_MB} MB ต่อการบันทึก 1 ครั้ง`, 413)

  return out
}

/** Replace one round of one factor. Results for items no longer in ERM3 are dropped. */
export const saveErm4 = async (
  caller: Caller,
  factorId: string,
  round: Round,
  input: Omit<Erm4Input, 'files'> & { files: string[] }
) => {
  const [found, plan] = await Promise.all([findFactor(factorId), getErm3(factorId)])

  if (!found) throw new ServiceError('ไม่พบปัจจัยเสี่ยงนี้ใน ERM2 อาจถูกลบไปแล้ว', 404)
  if (!plan) throw new ServiceError('ปัจจัยเสี่ยงนี้ยังไม่มีแผน ERM3 กรุณาบันทึก ERM3 ก่อน', 409)

  const ids = (list: { id: string }[]) => new Set(list.map(x => x.id))
  const current = (await store.load()).find(r => r.factorId === factorId && r.round === round)
  const files = await resolveFiles(caller, input.files, current?.files ?? [])

  return store.mutate(rows => {
    const i = rows.findIndex(r => r.factorId === factorId && r.round === round)
    const before = i >= 0 ? structuredClone(rows[i]) : undefined

    const rec: Erm4Record = {
      factorId,
      round,
      year: found.rec.year,
      unit: found.rec.unit,
      measures: pick(input.measures, ids(plan.measures.filter(m => m.type === 'measure'))),
      kpis: pick(input.kpis, ids(plan.kpis)),
      kris: pick(input.kris, ids(plan.kris)),
      level: input.level,
      links: input.links,
      files,
      updatedAt: new Date().toISOString(),
      updatedBy: caller.userId
    }

    if (i >= 0) rows[i] = rec
    else rows.push(rec)

    return { rec, before }
  })
}
