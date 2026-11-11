// Shared types for the MCP layer. Everything that can be done through a chatbot is a ToolDef;
// the same definitions serve the in-app chat (A) and external MCP clients (B/C).
import type { z } from 'zod'

import type { AppRole } from '@/configs/accessControl'

export type McpScope = 'mcp:read' | 'mcp:write'

export const ALL_SCOPES: McpScope[] = ['mcp:read', 'mcp:write']

/** Who is calling: always a real signed-in user, plus the client acting for them. */
export type Caller = {
  userId: string
  name: string
  email?: string
  role: AppRole

  /** True for sessions minted by the demo role simulator. */
  demo?: boolean

  /** 'in-app' for the built-in chat, otherwise the OAuth client_id. */
  clientId: string
  scopes: McpScope[]
}

type Args<S extends z.ZodRawShape> = z.infer<z.ZodObject<S>>

export type ToolDef<S extends z.ZodRawShape = z.ZodRawShape> = {

  /** snake_case, unique. */
  name: string
  title: string

  /** Thai. The model reads this to decide when to call the tool — say what it does and returns. */
  description: string
  input: S
  minRole: AppRole

  /** 'write' tools never run straight away: they create a pending action a human must confirm. */
  kind: 'read' | 'write'

  /** Required for 'write': one Thai sentence shown to the user before they confirm. */
  preview?: (caller: Caller, args: Args<S>) => string | Promise<string>
  handler: (caller: Caller, args: Args<S>) => Promise<unknown>
}

export const defineTool = <S extends z.ZodRawShape>(def: ToolDef<S>) => def as unknown as ToolDef

export type ToolOutcome =
  | { status: 'ok'; data: unknown }
  | { status: 'confirm'; actionId: string; preview: string; confirmUrl: string; expiresAt: string }
  | { status: 'denied' | 'invalid' | 'error'; message: string }
