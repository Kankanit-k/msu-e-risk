# PRD — MCP layer + chatbot support
Date: 2026-09-23   Status: APPROVED (2026-09-23)   Derived from: urd.md (approved 2026-09-23)
Approach chosen: official `@modelcontextprotocol/sdk` (1.30, `WebStandardStreamableHTTPServerTransport`) inside Next.js route handlers + hand-written OAuth 2.1 authorization server using `node:crypto`.

## 1. Product goals
- G1 One tool registry serves clients A, B and C with the caller's own permissions (URD §2).
- G2 External access (B/C) goes through standard MCP OAuth, reusing the system's existing ERP login (URD §5).
- G3 Writes never happen without a server-verified confirmation (URD §2, R3).
- G4 ERP secrets never reach the browser or the logs (D0).
- G5 Adding a tool = one file + one registry line (SC10).

## 2. Architecture

```
src/services/<domain>.ts           business logic (plain async functions, take a Caller)
src/mcp/types.ts                    Caller, ToolDef, AccessLevel reuse
src/mcp/tools/<name>.ts             one ToolDef per file
src/mcp/registry.ts                 list of ToolDefs
src/mcp/server.ts                   buildMcpServer(caller) → McpServer with only allowed tools
src/mcp/confirm.ts                  HMAC confirmation tokens (stateless) + single-use set in store
src/mcp/audit.ts                    one logger entry per call
src/mcp/auth/caller.ts              resolveCaller(req): session cookie → Caller | bearer → Caller | null
src/mcp/oauth/*                     store, tokens, clients allowlist, PKCE
src/app/api/mcp/route.ts            POST/GET/DELETE → transport.handleRequest
src/app/api/oauth/{register,authorize,token,revoke}/route.ts
src/app/.well-known/oauth-protected-resource/…  and …/oauth-authorization-server/…  (under basePath)
src/app/(private)/connections/page.tsx          "การเชื่อมต่อของฉัน"
src/app/(private)/oauth/consent/page.tsx        consent screen (needs ERP session)
src/app/api/chat/route.ts           in-app chatbot: OpenAI-compatible tool-calling loop, server side
src/components/chat/ChatWidget.tsx  floating widget
data/mcp-store.example.json         committed sample; data/mcp-store.json gitignored
```

Stateless MCP transport (`sessionIdGenerator: undefined`, JSON responses): a fresh `McpServer` is built per request for the resolved caller, so `tools/list` is naturally role-filtered; every handler re-checks `minRole` anyway.

## 3. User journeys
| Journey | Actor | Trigger | Steps | Success looks like |
| --- | --- | --- | --- | --- |
| J1 Ask in app | staff | opens chat widget | types question → /api/chat → LLM calls tool → answer | answer uses own data only |
| J2 Write in app | staff | "บันทึก…" | LLM calls write tool → preview card → user clicks ยืนยัน → executed | change happens only after click |
| J3 Connect Claude | staff | adds connector URL in claude.ai | 401 → discovery → register → authorize → ERP login → consent → token | tools appear in Claude |
| J4 Central bot | bot team | registers once | same OAuth; each staff links via authorize URL | bot calls tools as that staff |
| J5 Revoke | staff | /connections | clicks เพิกถอน | next call from that client → 401 |
| J6 Add tool | developer | new feature | follows add-mcp-tool skill | tool listed, typecheck passes |

## 4. Functional requirements
| ID | Requirement | Priority | Traces to |
| --- | --- | --- | --- |
| FR1 | Session callback exposes only `{user: {id, name, email, role}}`; ERP token and SCOPES stay server-side in JWT; profile console.log removed | must | D0 |
| FR2 | Settings + sidebar cookies named `<settingsCookieName>` / `<slug>-sidebar-groups`, path = basePath | must | D1 |
| FR3 | ToolDef = {name, title, description(th), inputSchema(zod), minRole, kind:'read'\|'write', scope, handler(caller,args), preview?(caller,args)} | must | D2 |
| FR4 | /api/mcp excluded from middleware redirect; unauthenticated → 401 + `WWW-Authenticate: Bearer resource_metadata="<base>/.well-known/oauth-protected-resource"` | must | SC3 |
| FR5 | Caller from session cookie (client `in-app`, scopes read+write) or bearer access token (client_id, granted scopes) | must | SC4 |
| FR6 | Tool hidden and rejected if caller level < minRole, or kind=write without `mcp:write` scope | must | SC4, A6 |
| FR7 | Write tools: create a pending action (server-stored args, 10 min, max 20 pending per user); only the owning user confirms it via a same-origin session request (chat drawer or `/actions/<id>/`). *Changed during build from the HMAC `confirm_token` design — a model can never confirm.* | must | SC5 |
| FR8 | Audit entry per call: user id, client id, tool, kind, outcome (preview/executed/denied/error), duration; args logged only with secret keys redacted | must | SC6 |
| FR9 | Tools: `whoami`, `get_help(page?)` (reads help registry; empty-safe), `save_note` demo write (in-memory, per user, marked demo) | must | D2 |
| FR10 | OAuth metadata: protected resource (RFC 9728) and AS metadata (RFC 8414 + OIDC-style path-appended copy) under basePath | must | R1 |
| FR11 | `/register` (RFC 7591): accept only if every redirect_uri ∈ `MCP_ALLOWED_REDIRECT_URIS` (exact match; localhost any port allowed only when not production) | must | SC7 |
| FR12 | `/authorize`: validate client + redirect + PKCE S256 + state; if no ERP session → login with callbackUrl; show consent (client name, scopes, read-only option) | must | SC7 |
| FR13 | `/token`: authorization_code (single use, 60 s, PKCE verify) and refresh_token (rotating, reuse → revoke grant); opaque random tokens, stored as SHA-256 | must | SC7, A4, A5 |
| FR14 | `/revoke` + /connections page listing grants with revoke | must | SC7 |
| FR15 | `McpStore` interface; JSON file impl with atomic write (tmp + rename) and in-process queue | must | A4 |
| FR16 | /api/chat: needs session; reads `LLM_BASE_URL` (default openrouter), `LLM_API_KEY`, `LLM_MODEL`; loop max 5 tool rounds; uses the same registry with caller from session; write tools return preview → UI card; confirm posts token | must | D4 |
| FR17 | Chat widget hidden-state message when no key; key never in client bundle or responses | must | SC9 |
| FR18 | Docs: CLAUDE.md rule, `.claude/skills/add-mcp-tool/SKILL.md`, `docs/mcp.md`, `.env.example` | must | D5 |

## 5. Non-functional requirements
| ID | Type | Requirement | Measured by |
| --- | --- | --- | --- |
| NFR1 | security | all token comparisons timing-safe; secrets from env (`MCP_TOKEN_SECRET`); no secrets in logs | code review + log grep |
| NFR2 | security | `AUTH_DISABLED` dev user only when `NODE_ENV !== 'production'` | test with NODE_ENV=production |
| NFR3 | security | rate limit /token, /register, /api/chat per IP (in-memory, same pattern as /api/log) | curl loop → 429 |
| NFR4 | cost | chat: max 5 tool rounds, max tokens cap via env | code review |
| NFR5 | compat | builds with `next build`; no dep besides sdk + zod | build log, package.json diff |

## 6. Roles & permissions
| Role | Can | Cannot |
| --- | --- | --- |
| user | tools with minRole user | admin tools |
| deptAdmin / universityAdmin | tools up to own level | above own level |
| OAuth client with mcp:read only | read tools | any write tool (hidden) |
| unauthenticated | discovery metadata, register (allowlisted) | /api/mcp, /api/chat |

## 7. Edge cases
| ID | Case | Expected |
| --- | --- | --- |
| E1 | confirm_token for different args / user | rejected, nothing executed |
| E2 | refresh token reused after rotation | whole grant revoked (theft signal) |
| E3 | store file missing/corrupt | missing → created; corrupt → error logged, fail closed (401) |
| E4 | LLM provider down / 4xx | chat shows Thai error, no stack to client |
| E5 | ERP session expires mid-authorize | redirected to login, returns to authorize |
| E6 | client registered, allowlist later shrinks | authorize rejects its redirect_uri |

## 8. Dependencies
| Dependency | Type | Owner | Risk if unavailable |
| --- | --- | --- | --- |
| @modelcontextprotocol/sdk 1.30 | npm | Anthropic/MCP | core |
| zod 4 | npm | — | schemas |
| ERP OAuth | service | ERP team | no login → no authorize |
| OpenRouter (BYOK) | service | user | chat A unavailable, rest fine |

## 9. Acceptance criteria
= URD SC1–SC11, plus: E1, E2, NFR2, NFR3 each have a test. Detailed in criteria.md.

## 10. Out of scope
As URD §9.

## 11. Open questions
- claude.ai callback URL to put in default allowlist: verify from Anthropic docs during build (`https://claude.ai/api/mcp/auth_callback` expected).
