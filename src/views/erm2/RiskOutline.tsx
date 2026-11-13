'use client'

// Shared by ERM2 - 3 and ERM4: year/unit filter, the SO › เป้าประสงค์ › กระบวนการ › Key Risk outline, and the
// risk-level legend. Each page renders its own risk rows through `renderRisk`.
import type { ReactNode } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Component Imports
import type { FilterField } from '@/components/kit'

// Lib / Config Imports
import { FISCAL_YEARS, UNITS } from '@/configs/units'
import { RISK_LEVELS } from '@/services/erm2Types'
import type { Erm1Tree, KeyRisk, ProcessRecord } from '@/services/erm1Types'

import type { ReportContext } from './Erm2Report'

export const riskFilterFields: FilterField[] = [
  {
    key: 'year',
    label: 'ปีงบประมาณ',
    type: 'select',
    required: true,
    options: FISCAL_YEARS.map(y => ({ value: String(y), label: String(y) }))
  },
  {
    key: 'unit',
    label: 'คณะ / หน่วยงาน',
    type: 'autocomplete',
    required: true,
    options: UNITS.map(u => ({ value: u, label: u }))
  }
]

export type RiskTarget = { process: ProcessRecord; risk: KeyRisk }

/** Only the branches that lead to at least one Key Risk. */
export const buildOutline = (data: Erm1Tree | null) => {
  if (!data) return []
  const withRisks = data.processes.filter(p => p.keyRisks.length)

  return data.so
    .map(so => ({
      so,
      goals: data.goals
        .filter(g => g.soId === so.id)
        .map(goal => ({ goal, processes: withRisks.filter(p => p.goalId === goal.id) }))
        .filter(g => g.processes.length)
    }))
    .filter(s => s.goals.length)
}

export type Outline = ReturnType<typeof buildOutline>

export const countRisks = (outline: Outline) =>
  outline.reduce(
    (n, s) => n + s.goals.reduce((m, g) => m + g.processes.reduce((k, p) => k + p.keyRisks.length, 0), 0),
    0
  )

export const reportContext = (data: Erm1Tree | null, { process, risk }: RiskTarget): ReportContext => {
  const goal = data?.goals.find(g => g.id === process.goalId)

  return {
    year: process.year,
    unit: process.unit,
    so: goal ? `${goal.soCode} ${goal.soName}` : '—',
    goal: goal ? `${goal.code} ${goal.name}` : '—',
    process: process.name,
    risk: risk.text
  }
}

export const LevelLegend = () => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }} aria-label='ระดับความเสี่ยง'>
    {RISK_LEVELS.map((l, i) => (
      <Box key={l.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{ inlineSize: 12, blockSize: 12, borderRadius: 0.5, bgcolor: l.color }} />
        <Typography variant='caption'>
          {l.name} {i ? RISK_LEVELS[i - 1].max + 1 : 1}–{l.max}
        </Typography>
      </Box>
    ))}
  </Box>
)

type Props = {
  outline: Outline
  renderRisk: (process: ProcessRecord, risk: KeyRisk, index: number) => ReactNode
}

const RiskOutline = ({ outline, renderRisk }: Props) => (
  <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
    <Typography
      sx={{
        px: 3,
        py: 1.5,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        fontWeight: 600,
        fontSize: '0.8125rem'
      }}
    >
      วัตถุประสงค์เชิงกลยุทธ์ / เป้าประสงค์ / กระบวนการดำเนินงาน(หลัก) / เหตุการณ์ความเสี่ยง (Key Risks*)
    </Typography>
    {outline.map(({ so, goals }) => (
      <Box key={so.id}>
        <Typography
          sx={{ px: 3, py: 1.5, bgcolor: 'primary.lightOpacity', borderBlockStart: 1, borderColor: 'divider' }}
        >
          <b>วัตถุประสงค์เชิงกลยุทธ์ :</b> {so.code} {so.name}
        </Typography>
        {goals.map(({ goal, processes }) => (
          <Box key={goal.id}>
            <Typography
              sx={{
                py: 1.5,
                paddingInlineStart: { xs: 3, md: 6 },
                bgcolor: 'action.hover',
                borderBlockStart: 1,
                borderColor: 'divider'
              }}
            >
              <b>เป้าประสงค์ที่ {goal.code}</b> {goal.name}
            </Typography>
            {processes.map((p, pi) => (
              <Box key={p.id}>
                <Typography
                  sx={{ py: 1.5, paddingInlineStart: { xs: 3, md: 9 }, borderBlockStart: 1, borderColor: 'divider' }}
                >
                  <b>กระบวนการดำเนินงานที่ {pi + 1}</b> {p.name}
                </Typography>
                {p.keyRisks.map((r, ri) => renderRisk(p, r, ri))}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    ))}
  </Box>
)

export default RiskOutline
