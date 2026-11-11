// RFC 9728 protected-resource metadata. Served both at the bare path and with the resource path
// appended (/.well-known/oauth-protected-resource/api/mcp), as clients try either.
import { urls } from '@/mcp/config'
import { ALL_SCOPES } from '@/mcp/types'

export const dynamic = 'force-dynamic'

export const GET = (req: Request) => {
  const u = urls(req)

  return Response.json(
    { resource: u.resource, authorization_servers: [u.issuer], scopes_supported: ALL_SCOPES, bearer_methods_supported: ['header'] },
    { headers: { 'access-control-allow-origin': '*' } }
  )
}
