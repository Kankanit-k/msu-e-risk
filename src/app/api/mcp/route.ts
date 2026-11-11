// MCP endpoint for external clients (B: central chatbot / LINE OA, C: Claude). OAuth bearer only —
// the in-app chat (A) calls the same tools directly through /api/chat.
// eslint-disable-next-line import/no-unresolved -- resolved via the package exports map (tsc resolves it)
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'

import { bearerCaller } from '@/mcp/auth'
import { urls } from '@/mcp/config'
import { buildMcpServer } from '@/mcp/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const unauthorized = (req: Request) =>
  new Response(JSON.stringify({ error: 'invalid_token', error_description: 'ต้องเข้าสู่ระบบผ่าน OAuth ก่อน' }), {
    status: 401,
    headers: {
      'content-type': 'application/json',
      'www-authenticate': `Bearer resource_metadata="${urls(req).resourceMetadata}"`
    }
  })

const handle = async (req: Request) => {
  const caller = await bearerCaller(req)

  if (!caller) return unauthorized(req)

  // Stateless: a fresh server + transport per request, JSON responses (no long-lived SSE).
  const server = buildMcpServer(caller, urls(req).action)
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })

  await server.connect(transport)

  return transport.handleRequest(req)
}

export { handle as GET, handle as POST, handle as DELETE }
