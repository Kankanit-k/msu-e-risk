// Upload one file (multipart field "file"). Session cookie + same-origin only.
// Type is checked by extension AND magic bytes; size by UPLOAD_MAX_MB. See docs/audit-and-uploads.md.
import { audit } from '@/libs/audit'
import { rateLimit } from '@/libs/rateLimit'
import { UPLOAD_MAX_BYTES, cleanName, detectType, saveUpload } from '@/libs/uploads'
import { isSameOrigin, sessionCaller } from '@/mcp/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const fail = (status: number, error: string) => Response.json({ error }, { status })

export const POST = async (req: Request) => {
  const caller = await sessionCaller()

  if (!caller) return fail(401, 'login_required')
  if (!isSameOrigin(req)) return fail(403, 'bad_origin')
  if (!rateLimit(`upload:${caller.userId}`, 30)) return fail(429, 'too_many_requests')

  // Reject early on the declared size; the parsed file is checked again below. Multipart overhead is small.
  const declared = Number(req.headers.get('content-length') ?? 0)

  if (declared > UPLOAD_MAX_BYTES + 64 * 1024) return fail(413, 'too_large')

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')

  if (!(file instanceof File)) return fail(400, 'file_required')
  if (file.size === 0) return fail(400, 'empty_file')
  if (file.size > UPLOAD_MAX_BYTES) return fail(413, 'too_large')

  const data = Buffer.from(await file.arrayBuffer())
  const name = cleanName(file.name)
  const type = detectType(name, data.subarray(0, 16))

  if (!type) return fail(415, 'type_not_allowed')

  const meta = await saveUpload(caller.userId, name, type, data)

  await audit({ actor: caller.userId, action: 'file.upload', target: meta.id, after: { name, type, size: meta.size } })

  return Response.json({ id: meta.id, name: meta.name, type: meta.type, size: meta.size }, { status: 201 })
}
