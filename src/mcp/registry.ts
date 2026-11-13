// Every tool a chatbot can call. Add one line per tool — see .claude/skills/add-mcp-tool.
import getHelp from './tools/getHelp'
import listErm1 from './tools/listErm1'
import listErm2 from './tools/listErm2'
import listErm3 from './tools/listErm3'
import listErm4 from './tools/listErm4'
import listGoals from './tools/listGoals'
import listSo from './tools/listSo'
import saveNote from './tools/saveNote'
import whoami from './tools/whoami'

import type { ToolDef } from './types'

export const tools: ToolDef[] = [whoami, getHelp, saveNote, listSo, listGoals, listErm1, listErm2, listErm3, listErm4]
