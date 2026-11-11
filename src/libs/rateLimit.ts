// Per-key fixed-window limiter (in memory, per process). Same idea as the one in /api/log.
import 'server-only'

const buckets = new Map<string, { count: number; resetAt: number }>()

export const rateLimit = (key: string, maxPerMinute: number) => {
  const now = Date.now()

  // Drop stale buckets so rotating keys can't grow the map forever.
  if (buckets.size > 10_000) for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k)
  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 })

    return true
  }

  if (bucket.count >= maxPerMinute) return false
  bucket.count += 1

  return true
}

// Assumes a reverse proxy that overwrites X-Forwarded-For; without one the header is client-controlled.
export const clientIp = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
