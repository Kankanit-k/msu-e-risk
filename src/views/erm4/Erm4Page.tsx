'use client'

// ERM4 : outline SO › เป้าประสงค์ › กระบวนการ › ความเสี่ยง › ปัจจัยเสี่ยง. A risk row shows its ERM2 report; a factor
// row shows which rounds (6 / 9 / 12 เดือน) are reported and opens the ERM4 editor. Needs an ERM3 plan first.
import { useCallback, useEffect, useMemo, useState } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

// Component Imports
import Link from '@/components/Link'
import { EmptyState, ErrorState, FilterBar, TableSkeleton } from '@/components/kit'
import type { FilterValues } from '@/components/kit'
import { defaultYear } from '@/views/strategy/shared'

// Lib / Config Imports
import { apiBase, callApi } from '@/libs/callApi'
import { UNITS } from '@/configs/units'
import { factorScore } from '@/services/erm2Types'
import type { RiskFactor } from '@/services/erm2Types'
import { ROUNDS, erm4TabsDone } from '@/services/erm4Types'
import type { Erm4Record, Erm4Tree } from '@/services/erm4Types'
import type { KeyRisk, ProcessRecord } from '@/services/erm1Types'

import Erm2Report, { REPORT_TITLE, ScoreBadge, contextLines, exportErm2Word } from '../erm2/Erm2Report'
import RiskOutline, {
  LevelLegend,
  buildOutline,
  countRisks,
  reportContext,
  riskFilterFields
} from '../erm2/RiskOutline'
import type { RiskTarget } from '../erm2/RiskOutline'
import Erm4Editor from './Erm4Editor'

type FactorTarget = RiskTarget & { factor: RiskFactor }

const Erm4Page = () => {
  const fullScreen = useMediaQuery((t: Theme) => t.breakpoints.down('md'))
  const [filter, setFilter] = useState<FilterValues>({ year: defaultYear, unit: UNITS[0] })
  const [data, setData] = useState<Erm4Tree | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reporting, setReporting] = useState<RiskTarget | null>(null)
  const [editing, setEditing] = useState<FactorTarget | null>(null)

  const { year, unit } = filter

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    callApi<Erm4Tree>(`${apiBase}/api/erm4?year=${year}&unit=${encodeURIComponent(unit)}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [year, unit])

  useEffect(load, [load])

  const outline = useMemo(() => buildOutline(data), [data])
  const factorsOf = (riskId: string) => data?.erm2.find(r => r.keyRiskId === riskId)?.factors ?? []
  const planOf = (factorId: string) => data?.erm3.find(r => r.factorId === factorId)
  const roundsOf = (factorId: string) => data?.erm4.filter(r => r.factorId === factorId) ?? []
  const contextOf = (t: RiskTarget) => reportContext(data, t)

  const replaceRound = (rec: Erm4Record) =>
    setData(
      d =>
        d && {
          ...d,
          erm4: [...d.erm4.filter(r => !(r.factorId === rec.factorId && r.round === rec.round)), rec]
        }
    )

  const roundChips = (f: RiskFactor) => {
    const plan = planOf(f.id)

    return (
      <Box sx={{ display: 'flex', gap: 1 }} aria-label='สถานะการรายงานแต่ละรอบ'>
        {ROUNDS.map(r => {
          const rec = roundsOf(f.id).find(x => x.round === r)
          const complete = !!rec && erm4TabsDone(plan, rec).every(Boolean)

          return (
            <Tooltip
              key={r}
              title={
                !rec
                  ? `รอบ ${r} เดือน: ยังไม่รายงาน`
                  : complete
                    ? `รอบ ${r} เดือน: รายงานครบ`
                    : `รอบ ${r} เดือน: รายงานยังไม่ครบ`
              }
            >
              <Chip
                size='small'
                variant={rec ? 'tonal' : 'outlined'}
                color={!rec ? 'default' : complete ? 'success' : 'warning'}
                label={`${r} ด.`}
              />
            </Tooltip>
          )
        })}
      </Box>
    )
  }

  const riskBlock = (process: ProcessRecord, risk: KeyRisk, i: number) => {
    const factors = factorsOf(risk.id)
    const target = { process, risk }

    return (
      <Box key={risk.id} sx={{ borderBlockStart: 1, borderColor: 'divider' }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 2,
            py: 2,
            paddingInlineStart: { xs: 2, md: 12 },
            paddingInlineEnd: 2
          }}
        >
          <Typography sx={{ flex: '1 1 280px', fontWeight: 600 }}>
            <Box component='span' sx={{ textDecoration: 'underline' }}>
              ความเสี่ยงที่ {i + 1}
            </Box>{' '}
            : {risk.text}
          </Typography>
          <Button
            size='small'
            variant='contained'
            color='info'
            onClick={() => setReporting(target)}
            startIcon={<i className='ri-chat-1-line' />}
          >
            รายงาน ERM2
          </Button>
        </Box>
        {factors.length === 0 && (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ pb: 2, paddingInlineStart: { xs: 4, md: 16 }, paddingInlineEnd: 2 }}
          >
            ยังไม่มีปัจจัยเสี่ยง — บันทึกใน{' '}
            <Link href='/risk/erm2-3' style={{ color: 'var(--mui-palette-primary-main)' }}>
              ERM2 - 3
            </Link>{' '}
            ก่อน
          </Typography>
        )}
        {factors.map((f, j) => {
          const plan = planOf(f.id)

          return (
            <Box
              key={f.id}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 3,
                pb: 2,
                paddingInlineStart: { xs: 4, md: 16 },
                paddingInlineEnd: 2
              }}
            >
              <ScoreBadge score={factorScore(f)} />
              <Typography sx={{ flex: '1 1 260px' }}>
                <Box component='span' sx={{ textDecoration: 'underline' }}>
                  ปัจจัยเสี่ยงที่ {j + 1}
                </Box>{' '}
                : {f.text}
              </Typography>
              {plan && roundChips(f)}
              <Tooltip title={plan ? '' : 'ยังไม่มีแผน ERM3 ของปัจจัยเสี่ยงนี้ บันทึกที่เมนู ERM2 - 3 ก่อน'}>
                <span>
                  <Button
                    size='small'
                    variant='contained'
                    color={roundsOf(f.id).length ? 'primary' : 'warning'}
                    disabled={!plan}
                    onClick={() => setEditing({ ...target, factor: f })}
                    startIcon={<i className='ri-save-line' />}
                  >
                    บันทึก ERM4
                  </Button>
                </span>
              </Tooltip>
            </Box>
          )
        })}
      </Box>
    )
  }

  const body = () => {
    if (loading && !data) return <TableSkeleton />
    if (error) return <ErrorState description={error} onRetry={load} />

    if (!outline.length)
      return (
        <EmptyState
          icon='ri-menu-2-line'
          title={`ยังไม่มี Key Risks ใน ERM1 ของปี ${year}`}
          description='ERM4 รายงานผลตามแผน ERM3 ของปัจจัยเสี่ยงแต่ละข้อ ให้บันทึก ERM1 และ ERM2 - 3 ของหน่วยงานนี้ก่อน'
          action={
            <Button component={Link} href='/risk/erm2-3' variant='contained'>
              ไปหน้า ERM2 - 3
            </Button>
          }
        />
      )

    return <RiskOutline outline={outline} renderRisk={riskBlock} />
  }

  const planCount = data?.erm3.length ?? 0

  return (
    <Box>
      <Box sx={{ mb: 5 }}>
        <Typography variant='h4' component='h1'>
          ERM4 : รายงานผลการดำเนินงาน
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          รายงานผลตามแผน ERM3 ของแต่ละปัจจัยเสี่ยง รอบ 6 / 9 / 12 เดือน — ผลมาตรการ KPI KRIs ระดับความเสี่ยง ณ รอบ
          และเอกสารแนบ
        </Typography>
      </Box>

      <Card sx={{ mb: 5 }} data-tour='erm4-filter'>
        <CardContent>
          <FilterBar fields={riskFilterFields} values={filter} onChange={setFilter} />
        </CardContent>
      </Card>

      <Card data-tour='erm4-tree'>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 3 }}>
            <Typography variant='h6' sx={{ flex: 1 }}>
              ความเสี่ยงและปัจจัยเสี่ยง
            </Typography>
            <LevelLegend />
            {data && (
              <Chip
                size='small'
                color='primary'
                variant='outlined'
                label={`${countRisks(outline)} ความเสี่ยง · ${planCount} แผน ERM3`}
              />
            )}
            <Button size='small' onClick={load} disabled={loading} startIcon={<i className='ri-refresh-line' />}>
              รีเฟรช
            </Button>
          </Box>
          {body()}
        </CardContent>
      </Card>

      {editing && planOf(editing.factor.id) && (
        <Erm4Editor
          key={editing.factor.id}
          factor={editing.factor}
          plan={planOf(editing.factor.id)!}
          records={roundsOf(editing.factor.id)}
          context={contextOf(editing)}
          onClose={() => setEditing(null)}
          onSaved={replaceRound}
        />
      )}

      <Dialog
        open={!!reporting}
        onClose={() => setReporting(null)}
        maxWidth='xl'
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby='erm4-erm2-report-title'
      >
        {reporting && (
          <>
            <DialogTitle id='erm4-erm2-report-title' sx={{ paddingInlineEnd: 12 }}>
              {REPORT_TITLE}
              {contextLines(contextOf(reporting)).map(l => (
                <Typography key={l} variant='body2' color='text.secondary'>
                  {l}
                </Typography>
              ))}
              <IconButton
                aria-label='ปิด'
                onClick={() => setReporting(null)}
                sx={{ position: 'absolute', insetBlockStart: 12, insetInlineEnd: 12 }}
              >
                <i className='ri-close-line' />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Erm2Report
                process={reporting.process.name}
                risk={reporting.risk.text}
                factors={factorsOf(reporting.risk.id)}
              />
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Button
                  variant='outlined'
                  onClick={() => exportErm2Word(factorsOf(reporting.risk.id), contextOf(reporting))}
                  startIcon={<i className='ri-file-word-line' />}
                >
                  Export Word
                </Button>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  )
}

export default Erm4Page
