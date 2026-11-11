# MCP & chatbot layer

Every system cloned from this template exposes its functions as MCP tools, so a chatbot can
work on behalf of the signed-in user, with that user's permissions only.

| Client | How it connects | Auth |
| :-- | :-- | :-- |
| A. In-app assistant (navbar icon → drawer) | `POST /api/chat` → LLM → `runTool` | existing session cookie |
| B. Central MSU chatbot / LINE OA | MCP Streamable HTTP at `/api/mcp/` | OAuth 2.1 (PKCE) |
| C. Claude Desktop / claude.ai custom connector | same | same |

## Architecture

- `src/services/*` — business logic, used by both pages and tools.
- `src/mcp/tools/*` + `registry.ts` — tool definitions (Thai description, zod input, `minRole`,
  `kind`). Recipe: `.claude/skills/add-mcp-tool/SKILL.md`.
- `tools/list` only contains tools the caller's role and token scope allow; `runTool` checks again.
- **Write tools never run directly.** They create a pending action (10 min). A human confirms it
  in the chat drawer or at `/actions/<id>/`. A same-origin, session-authenticated request is
  required, so a model cannot confirm.
- Every call is audited through `src/libs/logger` (`source: 'mcp'`).

## Connecting Claude (C)

Settings → Connectors → Add custom connector → URL:

```
https://<host>/<basePath>/api/mcp/
```

Keep the trailing slash (`trailingSlash: true` in next.config). Claude discovers OAuth from
the `WWW-Authenticate` header, registers itself (RFC 7591), and sends the user to sign in with
ERP and approve on `/oauth/consent/`. The user can tick "read only".

## Connecting the central chatbot (B)

1. Add its OAuth callback URL to `MCP_ALLOWED_REDIRECT_URIS`. This replaces the defaults, so
   list the Claude callbacks again if you still need them.
2. It registers at `/api/oauth/register/`, then runs authorization code + PKCE S256.
3. Access tokens last 1 h; refresh tokens last 30 days and rotate on every use. Reusing an old
   refresh token revokes the whole grant.

Users see and revoke their connections at `/connections/` (profile menu → การเชื่อมต่อของฉัน).

## Environment

See the MCP block in `.env.example`: `MCP_PUBLIC_URL`, `MCP_ALLOWED_REDIRECT_URIS`,
`MCP_STORE_FILE`, `LLM_*`. The in-app assistant works with any OpenAI-compatible endpoint
(OpenRouter by default); without `LLM_API_KEY` it shows a "not configured" notice.

## Reverse proxy

Discovery lives under the basePath:
`/<basePath>/.well-known/oauth-protected-resource/` and `/<basePath>/.well-known/oauth-authorization-server/`.
The 401 from `/api/mcp/` points to it explicitly, so most clients work as is. For clients that
only look at the host root, proxy `/.well-known/oauth-protected-resource/<basePath>/...` and
`/.well-known/oauth-authorization-server/<basePath>/...` to the app. Set `MCP_PUBLIC_URL` so
advertised URLs use the public host.

## Storage

`data/mcp-store.json` (gitignored; the shape is in `data/mcp-store.example.json`). Tokens and
codes are stored only as SHA-256 hashes. Writes are atomic and file mode is 600. A corrupt file
fails closed.

**Single-process only.** The file store is not safe for multiple instances or PM2 cluster
mode. For that, implement `McpStore` (`src/mcp/store.ts`) on the system's real database.

## PDPA

- Tools return only what the user can already see in the UI, and only the fields needed.
- The in-app assistant sends the conversation and tool results to the configured LLM provider.
  Tell users about this, and do not expose tools returning sensitive personal data to external
  LLMs without approval.
- The session no longer exposes the ERP token, 2FA secret, or LINE token to the browser.
