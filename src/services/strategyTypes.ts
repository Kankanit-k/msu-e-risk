// SO (วัตถุประสงค์เชิงกลยุทธ์) and เป้าประสงค์ (goals) — shared types, safe to import from client code.

/**
 * Where SO / goals may come from (env STRATEGY_SOURCE). Undecided until the PMS meeting, so all three work:
 *   both   — pull from PMS and type new ones here (default)
 *   pms    — PMS only; this system cannot create or edit them
 *   manual — typed here only; the PMS button is hidden
 */
export type StrategyMode = 'both' | 'pms' | 'manual'

export type Source = 'manual' | 'pms'

type Base = {
  id: string
  year: number
  unit: string
  code: string
  name: string
  source: Source

  /** Id of the item in PMS (source 'pms' only). */
  pmsId?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export type SoRecord = Base

/** เป้าประสงค์ — always belongs to one SO of the same year + unit. */
export type GoalRecord = Base & { soId: string }

/** A goal as the page shows it: with its SO's code and name. */
export type GoalRow = GoalRecord & { soCode: string; soName: string }

export type SoInput = { year: number; unit: string; code: string; name: string }
export type GoalInput = SoInput & { soId: string }

/** An item as PMS returns it, plus whether it is already in this system. */
export type PmsItem = {
  pmsId: string
  code: string
  name: string
  imported: boolean

  /** Goals only: parent SO code, and why it cannot be imported yet (e.g. SO not imported). */
  soCode?: string
  blockedReason?: string
}

export type ImportResult = { added: { code: string }[]; skipped: string[]; fromYear?: number }
