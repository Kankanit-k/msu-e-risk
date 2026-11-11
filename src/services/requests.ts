// Requests (คำขอ) — the approval-workflow demo's data layer.
//
// Storage is one JSON file (data/requests.json, gitignored; shape in data/requests.example.json),
// fine for a single Node process. To move to the real backend, reimplement the four exported
// functions (listRequests, createRequest, updateRequest, transitionRequest) against your API/DB —
// the API routes and the page only call these.
import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { accessLevelRank } from '@/configs/accessControl'
import type { Caller } from '@/mcp/types'

import { transitions } from './requestTypes'
import type { RequestAction, RequestInput, RequestRecord } from './requestTypes'

const FILE = path.join(process.cwd(), 'data', 'requests.json')

// Serialize writes within this process so two saves never interleave.
const g = globalThis as unknown as { __requestsQueue?: Promise<unknown> }

const load = async (): Promise<RequestRecord[]> => {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8')) as RequestRecord[]
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err // corrupt file → fail loudly rather than overwrite it
  }
}

const mutate = <T>(fn: (rows: RequestRecord[]) => T): Promise<T> => {
  const run = async () => {
    const rows = await load()
    const result = fn(rows)

    await fs.mkdir(path.dirname(FILE), { recursive: true })
    const tmp = `${FILE}.${process.pid}.tmp`

    await fs.writeFile(tmp, JSON.stringify(rows, null, 2), { mode: 0o600 })
    await fs.rename(tmp, FILE)

    return result
  }

  const next = (g.__requestsQueue ?? Promise.resolve()).then(run, run)

  g.__requestsQueue = next.catch(() => undefined)

  return next
}

export class RequestError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}

/** Approvers: department admins and above. Change here to use a dedicated permission. */
export const canApprove = (caller: Caller) => accessLevelRank[caller.role] >= accessLevelRank.deptAdmin

/** Approvers see everything; others see only their own requests. */
export const listRequests = async (caller: Caller) => {
  const rows = await load()

  return canApprove(caller) ? rows : rows.filter(r => r.requesterId === caller.userId)
}

export const createRequest = (caller: Caller, input: RequestInput) =>
  mutate(rows => {
    const now = new Date().toISOString()

    const rec: RequestRecord = {
      ...input,
      id: crypto.randomUUID(),
      status: 'draft',
      requesterId: caller.userId,
      requesterName: caller.name,
      createdAt: now,
      updatedAt: now,
      history: [{ status: 'draft', by: caller.name, at: now }]
    }

    rows.push(rec)

    return rec
  })

const find = (rows: RequestRecord[], id: string) => {
  const rec = rows.find(r => r.id === id)

  if (!rec) throw new RequestError('ไม่พบคำขอ', 404)

  return rec
}

/** Only the requester, and only while the request is still a draft. */
export const updateRequest = (caller: Caller, id: string, input: RequestInput) =>
  mutate(rows => {
    const rec = find(rows, id)

    if (rec.requesterId !== caller.userId) throw new RequestError('แก้ไขได้เฉพาะคำขอของตัวเอง', 403)
    if (rec.status !== 'draft') throw new RequestError('แก้ไขได้เฉพาะคำขอที่เป็นร่าง', 409)

    const before = { ...rec }

    Object.assign(rec, input, { updatedAt: new Date().toISOString() })

    return { rec, before }
  })

export const transitionRequest = (caller: Caller, id: string, action: RequestAction, note?: string) =>
  mutate(rows => {
    const rec = find(rows, id)
    const t = transitions[action]

    if (t.adminOnly && !canApprove(caller)) throw new RequestError('ต้องเป็นผู้ดูแลจึงจะอนุมัติได้', 403)
    if (!t.adminOnly && rec.requesterId !== caller.userId) throw new RequestError('ส่งได้เฉพาะคำขอของตัวเอง', 403)
    if (rec.status !== t.from) throw new RequestError('สถานะของคำขอเปลี่ยนไปแล้ว กรุณาโหลดใหม่', 409)

    const now = new Date().toISOString()
    const before = { status: rec.status }

    rec.status = t.to
    rec.updatedAt = now
    rec.history.push({ status: t.to, by: caller.name, at: now, ...(note && { note }) })

    return { rec, before }
  })
