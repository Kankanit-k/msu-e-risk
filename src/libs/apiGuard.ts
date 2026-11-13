// Shared guard + error mapping for JSON API routes backed by services (session cookie + same-origin writes).
import 'server-only'

import { ServiceError } from '@/libs/jsonStore'
import { PmsError } from '@/libs/pms'
import { isSameOrigin, sessionCaller } from '@/mcp/auth'

export const guard = async (req: Request, write = false) => {
  if (write && !isSameOrigin(req)) return { error: Response.json({ error: 'bad origin' }, { status: 403 }) }

  const caller = await sessionCaller()

  return caller ? { caller } : { error: Response.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 }) }
}

export const fail = (err: unknown) => {
  if (err instanceof ServiceError) return Response.json({ error: err.message }, { status: err.status })
  if (err instanceof PmsError) return Response.json({ error: err.message }, { status: 502 })
  throw err // unexpected → logged by instrumentation, 500
}
