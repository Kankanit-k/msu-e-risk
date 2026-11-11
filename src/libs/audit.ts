// Append-only audit trail: who did what to which record, and what changed.
// One JSONL file per month under AUDIT_DIR (default data/audit, gitignored via /data/*).
// audit() never throws — a broken disk must not break the action being audited.
import 'server-only'

import { appendFile, mkdir, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import { logger } from '@/libs/logger'

export const AUDIT_DIR = path.resolve(process.env.AUDIT_DIR || path.join(process.cwd(), 'data', 'audit'))

export type AuditInput = {
  actor: string
  action: string
  target?: string
  before?: unknown
  after?: unknown
}

export type AuditEntry = {
  at: string
  actor: string
  action: string
  target?: string

  /** Changed fields only: { field: [before, after] }. Absent when nothing was compared. */
  diff?: Record<string, [unknown, unknown]>
}

const SECRET_KEY = /pass(word|wd)?|secret|token|api[-_]?key|authorization|cookie|credential|otp|^pin$|private/i
const MAX_STRING = 500

/** Deep copy with secret-looking fields masked and long strings cut. */
export const redact = (value: unknown, depth = 0): unknown => {
  if (typeof value === 'string') return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value
  if (value === null || typeof value !== 'object') return value
  if (depth > 6) return '[depth]'
  if (Array.isArray(value)) return value.slice(0, 50).map(v => redact(v, depth + 1))

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      SECRET_KEY.test(k) ? '[redacted]' : redact(v, depth + 1)
    ])
  )
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Field-level diff. Non-objects are compared as a single "value" field. */
export const diff = (before: unknown, after: unknown): Record<string, [unknown, unknown]> => {
  const a = isRecord(before) ? before : before === undefined ? {} : { value: before }
  const b = isRecord(after) ? after : after === undefined ? {} : { value: after }
  const out: Record<string, [unknown, unknown]> = {}

  for (const key of new Set([...Object.keys(a), ...Object.keys(b)]))
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) out[key] = [a[key] ?? null, b[key] ?? null]

  return out
}

const monthOf = (d: Date) => d.toISOString().slice(0, 7)
const MONTH = /^\d{4}-\d{2}$/

export const audit = async ({ actor, action, target, before, after }: AuditInput): Promise<void> => {
  try {
    const now = new Date()
    const entry: AuditEntry = { at: now.toISOString(), actor: String(actor), action: String(action) }

    if (target !== undefined) entry.target = String(target)
    if (before !== undefined || after !== undefined) entry.diff = diff(redact(before), redact(after))

    await mkdir(AUDIT_DIR, { recursive: true })
    await appendFile(path.join(AUDIT_DIR, `${monthOf(now)}.jsonl`), JSON.stringify(entry) + '\n', { mode: 0o600 })
  } catch (error) {
    try {
      logger.error('audit write failed', { source: 'server', error, context: { actor, action, target } })
    } catch {
      // Nothing left to do — never throw into the caller.
    }
  }
}

/** Months that have a log file, newest first. */
export const auditMonths = async (): Promise<string[]> =>
  (await readdir(AUDIT_DIR).catch(() => [] as string[]))
    .map(f => f.replace(/\.jsonl$/, ''))
    .filter(m => MONTH.test(m))
    .sort()
    .reverse()

export type AuditQuery = { month?: string; actor?: string; action?: string; page?: number; pageSize?: number }

/** One month's entries, newest first, filtered (case-insensitive substring) and paginated. */
export const readAudit = async ({ month, actor, action, page = 1, pageSize = 25 }: AuditQuery) => {
  const m = month && MONTH.test(month) ? month : monthOf(new Date())
  const raw = await readFile(path.join(AUDIT_DIR, `${m}.jsonl`), 'utf8').catch(() => '')
  const has = (v: string | undefined, q?: string) => !q || (v ?? '').toLowerCase().includes(q.toLowerCase())

  const rows = raw
    .split('\n')
    .flatMap(line => {
      try {
        return line ? [JSON.parse(line) as AuditEntry] : []
      } catch {
        return []
      }
    })
    .filter(e => has(e.actor, actor) && has(e.action, action))
    .reverse()

  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages)

  return {
    month: m,
    total: rows.length,
    page: current,
    pages,
    rows: rows.slice((current - 1) * pageSize, current * pageSize)
  }
}
