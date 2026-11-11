# src/services

Business logic lives here — plain async functions that take a `Caller` (who is acting) plus
arguments, and return data. Pages, API routes and MCP tools all call these functions, so a rule
enforced here holds no matter whether a person clicks a button or a chatbot calls a tool.

- No React, no `NextRequest` — just data in, data out.
- Check ownership/permissions here (e.g. "a user may only read their own requests"),
  not only in the page.
- Return only the fields the caller needs; tool results are sent to the LLM provider.
