# Handoff — MCP / chatbot layer (2026-09-23)

## State
Done on branch `feat/mcp-chatbot`: MCP server (`/api/mcp/`), OAuth 2.1 AS for external chatbots,
in-app AI drawer (BYOK, OpenRouter default), human-confirmed write actions, `/connections/`,
per-system cookies, session secret leak fix, docs (`docs/mcp.md`, `add-mcp-tool` skill).
Acceptance: 29/29 (`check.mjs`), independent verifier no FAIL (`verdict.md`), security review
mediums fixed (frame-ancestors/X-Frame-Options, 90-day hard grant cap, pending-action cap,
rate-limit map sweep, redirect_uris cap).

## Not verified
- Real claude.ai connector, real ERP login, real LLM call (needs LLM_API_KEY), admin-only tool filtering with a real admin tool.

## Next
- Rotate NEXTAUTH_SECRET, ERP AUTH_CLIENT_SECRET, Discord webhook (they were in git history; files now untracked).
- Open lows from security review: trusted-proxy IP, parallel-refresh grace window, require MCP_PUBLIC_URL in prod, explicit flag for localhost redirects, live role re-check per bearer call (needs ERP lookup).
- Deferred scope: in-app tutorial, AI screenshot/video manual pipeline.
- Replace demo `save_note` / `src/services/notes.ts` with real tools per system.
