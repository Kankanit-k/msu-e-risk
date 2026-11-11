// DEMO service — shows the write-tool pattern end to end. Notes live in memory and vanish on
// restart. Delete this file (and src/mcp/tools/saveNote.ts) once the system has real tools.
import 'server-only'

import type { Caller } from '@/mcp/types'

export type Note = { id: string; text: string; createdAt: string }

const globalNotes = globalThis as unknown as { __demoNotes?: Map<string, Note[]> }
const notes = (globalNotes.__demoNotes ??= new Map<string, Note[]>())

export const listNotes = async (caller: Caller): Promise<Note[]> => notes.get(caller.userId) ?? []

export const saveNote = async (caller: Caller, text: string): Promise<Note> => {
  const note = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }

  notes.set(caller.userId, [...(notes.get(caller.userId) ?? []), note])

  return note
}
