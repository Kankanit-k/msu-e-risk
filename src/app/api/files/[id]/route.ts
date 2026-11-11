// Download an upload. Session required; only the owner or an admin (deptAdmin and up) may read it.
// Always served as an attachment with nosniff and a sandbox CSP, so it never renders as our origin.
import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'

import { accessLevelRank } from '@/configs/accessControl'
import { audit } from '@/libs/audit'
import { findUpload } from '@/libs/uploads'
import { sessionCaller } from '@/mcp/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const caller = await sessionCaller()

  if (!caller) return Response.json({ error: 'login_required' }, { status: 401 })

  const found = await findUpload((await params).id)

  if (!found) return Response.json({ error: 'not_found' }, { status: 404 })

  const { meta, file } = found

  if (meta.owner !== caller.userId && accessLevelRank[caller.role] < accessLevelRank.deptAdmin)
    return Response.json({ error: 'forbidden' }, { status: 403 })

  if (meta.owner !== caller.userId) await audit({ actor: caller.userId, action: 'file.download', target: meta.id })

  const ascii = meta.name.replace(/[^\x20-\x7e]/g, '_').replace(/[\\"]/g, '_')

  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: {
      'content-type': meta.type,
      'content-length': String(meta.size),
      'content-disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox; frame-ancestors 'none'",
      'cache-control': 'private, no-store'
    }
  })
}
