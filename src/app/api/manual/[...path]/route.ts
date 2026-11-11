// Serves the generated manual (screenshots, PDF, videos) from data/manual — behind login.
// Files in public/ would be world-readable: middleware skips any path with a dot.
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

import { sessionCaller } from '@/mcp/auth'
import { MANUAL_DIR } from '@/libs/manualFiles'

const TYPES: Record<string, string> = { '.png': 'image/png', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8' }

export const GET = async (req: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  if (!(await sessionCaller())) return new Response('Unauthorized', { status: 401 })

  const file = path.resolve(MANUAL_DIR, ...(await params).path)
  const type = TYPES[path.extname(file)]

  // Only known file types, and never outside data/manual.
  if (!type || !file.startsWith(MANUAL_DIR + path.sep)) return new Response('Not found', { status: 404 })

  const info = await stat(file).catch(() => null)

  if (!info?.isFile()) return new Response('Not found', { status: 404 })

  const headers: Record<string, string> = {
    'content-type': type,
    'accept-ranges': 'bytes',
    'cache-control': 'private, max-age=300',
    'x-content-type-options': 'nosniff'
  }

  // Range support so the browser can seek in the videos.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '')

  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]))
    const end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1

    if (start > end || start >= info.size)
      return new Response(null, { status: 416, headers: { 'content-range': `bytes */${info.size}` } })

    return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, {
      status: 206,
      headers: { ...headers, 'content-range': `bytes ${start}-${end}/${info.size}`, 'content-length': String(end - start + 1) }
    })
  }

  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: { ...headers, 'content-length': String(info.size) }
  })
}
