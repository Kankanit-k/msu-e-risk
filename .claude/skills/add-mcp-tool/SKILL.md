---
name: add-mcp-tool
description: Add a function that chatbots (in-app assistant, central MSU chatbot, Claude connector) can call on the user's behalf. Use when adding any action a user should be able to ask a chatbot to do.
---

# Add an MCP tool

Tools are thin wrappers over `src/services/*`. The page UI and the tool call the same service
function, so business rules and permission checks live in one place.

1. **Service first.** Put the logic in `src/services/<domain>.ts` taking `(caller, ...args)`.
   Enforce ownership/unit scope there (e.g. a dept admin only sees their own department).
2. **Tool file** `src/mcp/tools/<name>.ts`:

```ts
import { z } from 'zod'

import { listMyRequests } from '@/services/requests'

import { defineTool } from '../types'

export default defineTool({
  name: 'list_my_requests',               // snake_case, unique
  title: 'รายการคำขอของฉัน',
  description: 'คืนคำขอของผู้ใช้ ... ใช้เมื่อผู้ใช้ถามถึง ...', // Thai: what it returns + when to use it
  input: { status: z.enum(['pending', 'approved']).optional().describe('สถานะ') },
  minRole: 'user',                         // user | deptAdmin | universityAdmin
  kind: 'read',                            // 'write' => needs preview, runs only after human confirm
  handler: async (caller, args) => listMyRequests(caller, args)
})
```

3. **Register** it: one line in `src/mcp/registry.ts`.
4. **Write tools** must set `kind: 'write'` and a `preview(caller, args)` that states exactly what
   will change, in Thai. The chatbot never executes them; the user confirms on `/actions/<id>`
   or in the chat drawer.

## Rules
- No delete or bulk tools without a separate review.
- Return only the fields the user needs. Never return secrets, tokens, or other people's
  personal data (PDPA).
- Keep inputs strict (zod) and bounded (`.max()` on strings/arrays).
- Tool output is shown to an LLM: return data, not instructions.
- Verify: `pnpm exec tsc --noEmit`, then call it from the chat drawer or MCP Inspector.
