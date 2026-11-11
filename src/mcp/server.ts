// Builds a fresh MCP server per request, registering only the tools this caller may use —
// so tools/list is role- and scope-filtered by construction. runTool re-checks anyway.
import 'server-only'

// eslint-disable-next-line import/no-unresolved -- resolved via the package exports map (tsc resolves it)
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import themeConfig from '@configs/themeConfig'

import { outcomeText, runTool, toolsFor } from './run'
import type { Caller } from './types'

export const buildMcpServer = (caller: Caller, actionUrl: (id: string) => string) => {
  const server = new McpServer(
    { name: themeConfig.templateName, version: '1.0.0' },
    { instructions: `${themeConfig.templateSubtitle} — ทำงานในนามของ ${caller.name} ด้วยสิทธิ์ของผู้ใช้คนนี้เท่านั้น` }
  )

  for (const tool of toolsFor(caller)) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.input,
        annotations: { readOnlyHint: tool.kind === 'read', destructiveHint: false }
      },
      async (args: unknown) => {
        const outcome = await runTool(caller, tool.name, args, actionUrl)

        return {
          content: [{ type: 'text' as const, text: outcomeText(outcome) }],
          isError: outcome.status === 'denied' || outcome.status === 'invalid' || outcome.status === 'error'
        }
      }
    )
  }

  return server
}
