// RFC 8414 authorization-server metadata (also served at the OIDC discovery path).
import 'server-only'

import { urls } from './config'
import { ALL_SCOPES } from './types'

export const authServerMetadata = (req: Request) => {
  const u = urls(req)

  return Response.json(
    {
      issuer: u.issuer,
      authorization_endpoint: u.authorize,
      token_endpoint: u.token,
      registration_endpoint: u.register,
      revocation_endpoint: u.revoke,
      scopes_supported: ALL_SCOPES,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none']
    },
    { headers: { 'access-control-allow-origin': '*' } }
  )
}
