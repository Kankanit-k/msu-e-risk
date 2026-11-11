// Every tool a chatbot can call. Add one line per tool — see .claude/skills/add-mcp-tool.
import getHelp from './tools/getHelp'
import saveNote from './tools/saveNote'
import whoami from './tools/whoami'

import type { ToolDef } from './types'

export const tools: ToolDef[] = [whoami, getHelp, saveNote]
