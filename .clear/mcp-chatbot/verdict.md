# Verdict: mcp-chatbot (independent verifier, 2026-09-23)

Evidence: `node --env-file=.env.local .clear/mcp-chatbot/check.mjs` -> 29/29 PASS; `pnpm exec tsc --noEmit` exit 0; `pnpm lint` clean (no output).

| Criterion | Verdict | Evidence |
|---|---|---|
| SC1 session has no secrets | PASS | check.mjs "SC1" |
| SC2 cookies basePath + system name | PASS (code review) | src/configs/cookieConfig.ts:7,9 (COOKIE_PATH=basePath, `<slug>-sidebar-groups`); no runtime test |
| SC3 401 + resource_metadata, no redirect | PASS | check.mjs |
| SC4 role/scope filtering, hidden tool rejected | PASS | check.mjs SC4/A6 |
| SC5 write confirm (deviation) | PASS (intent met) | run.ts:68-88 parks pending action, no execution; run.ts:107 binds to user, pending status, expiry, single use (atomic claim); args stored server-side so they cannot be swapped (covers E1). Bearer/model, other user, cross-origin all refused (check.mjs). Stronger than HMAC: model can never self-confirm. |
| SC6 audit per call, no secrets | PASS (code review) | run.ts:22-26 audit(user, client, tool, outcome, duration). Note: a write yields 2 entries (pending + executed/cancelled), acceptable. Log contents not grepped at runtime. |
| SC7 OAuth (allowlist, PKCE, code single-use, expiry, refresh rotation, revoke) | PASS | check.mjs |
| SC8 real Inspector/Claude Code flow | PARTIAL | only "SC8-lite" scripted whoami; no real client run |
| SC9 chatbot | PARTIAL | no-key 503/configured:false and login-required PASS; "key set -> whoami answer" and "key absent from network responses" not tested (needs LLM key + browser) |
| SC10 add tool = 1 file + 1 line | PASS (structure) | registry.ts is a single array; SKILL.md steps match ToolDef (types.ts:34-40); not exercised end-to-end |
| SC11 next build + lint | PARTIAL | lint + tsc pass; `next build` not run (would clobber dev server .next) |
| E1 wrong args/user | PASS | args server-held; other-user confirm refused |
| E2 refresh reuse revokes grant | PASS | check.mjs |
| NFR1 timing-safe, no secrets | PASS (review) | config.ts:81 timingSafeEqual; tokens stored SHA-256; MCP_TOKEN_SECRET no longer needed (no HMAC) |
| NFR2 dev bypass not in prod | PASS for MCP | mcp/auth.ts:18 guards NODE_ENV. Note: pre-existing middleware.ts:14 AUTH_DISABLED has no prod guard (not introduced here) |
| NFR3 rate limit token/register/chat | PARTIAL | rateLimit imported in oauth/token, register, revoke, chat routes; no 429 test in check.mjs |
| NFR4/NFR5 | PASS (review) | LLM_MAX_TOKENS env; package.json deps |

## Docs vs code
- docs/mcp.md, SKILL.md, CLAUDE.md MCP section: consistent with pending-action confirm model; no stale HMAC / confirm_token / MCP_TOKEN_SECRET references.
- .env.example MCP block lists every MCP/LLM env var the code reads (MCP_PUBLIC_URL, MCP_ALLOWED_REDIRECT_URIS, MCP_STORE_FILE, LLM_BASE_URL/API_KEY/MODEL/MAX_TOKENS/MAX_PER_MINUTE).
- data/mcp-store.example.json keys and record fields match store.ts types (codes sample empty).
- PRD FR7 text still describes HMAC tokens; update PRD to record the deviation.

## Other observation
- git index shows `.env.local` and `.env.production` staged as deleted (untracked from git, files still on disk). Likely intentional secret hygiene, but confirm before commit; if they were ever pushed, rotate the secrets.
