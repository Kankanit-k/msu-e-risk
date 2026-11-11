// Next Imports
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Logger Imports
import { logger, logLevels } from '@/libs/logger'
import type { LogLevel, LogSource } from '@/libs/logger'

// The file transport needs Node APIs — never let this route be edge-compiled.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cheap flood guard: per-IP budget so a looping client can't fill the disk.
const MAX_PER_MINUTE = Number.parseInt(process.env.LOG_CLIENT_MAX_PER_MINUTE ?? '60', 10)
const buckets = new Map<string, { count: number; resetAt: number }>()

const allow = (ip: string) => {
  const now = Date.now()
  const bucket = buckets.get(ip)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + 60_000 })

    return true
  }

  if (bucket.count >= MAX_PER_MINUTE) return false

  bucket.count += 1

  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  if (!allow(ip)) return NextResponse.json({ ok: false, error: 'rate limited' }, { status: 429 })

  let body: Record<string, unknown>

  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })
  }

  const level = (logLevels as readonly string[]).includes(String(body.level)) ? (body.level as LogLevel) : 'error'
  const message = typeof body.message === 'string' && body.message ? body.message : 'Client log'

  logger[level](message, {
    source: (body.source as LogSource) ?? 'client',
    error: body.error,
    context: {
      ...(body.context as Record<string, unknown> | undefined),
      client: true,
      page: body.page,
      ip
    }
  })

  return NextResponse.json({ ok: true })
}
