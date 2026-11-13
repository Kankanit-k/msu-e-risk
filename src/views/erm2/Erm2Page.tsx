'use client'

// ERM2 - 3 : outline SO › เป้าประสงค์ › กระบวนการ › ความเสี่ยงที่ N (Key Risks from ERM1) › ปัจจัยเสี่ยงที่ N.
// Each Key Risk opens the 5-step ERM2 editor; each factor shows its initial L × I score and opens the 7-step ERM3.
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
import { factorScore, stepsDone } from '@/services/erm2Types'
import { erm3StepsDone } from '@/services/erm3Types'
import type { Erm2Record, RiskFactor } from '@/services/erm2Types'
import type { Erm3Record, Erm3Tree } from '@/services/erm3Types'
import type { KeyRisk, ProcessRecord } from '@/services/erm1Types'

import Erm3Editor from '../erm3/Erm3Editor'
import Erm2Editor from './Erm2Editor'
import Erm2Report, { REPORT_TITLE, ScoreBadge, contextLines, exportErm2Word } from './Erm2Report'
import RiskOutline, { LevelLegend, buildOutline, countRisks, reportContext, riskFilterFields } from './RiskOutline'
import type { RiskTarget } from './RiskOutline'

type Target = RiskTarget
type FactorTarget = Target & { factor: RiskFactor }

const Erm2Page = () => {
  const fullScreen = useMediaQuery((t: Theme) => t.breakpoints.down('md'))
  const [filter, setFilter] = useState<FilterValues>({ year: defaultYear, unit: UNITS[0] })
  const [data, setData] = useState<Erm3Tree | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Target | null>(null)
  const [reporting, setReporting] = useState<Target | null>(null)
  const [planning, setPlanning] = useState<FactorTarget | null>(null)

  const { year, unit } = filter

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    callApi<Erm3Tree>(`${apiBase}/api/erm3?year=${year}&unit=${encodeURIComponent(unit)}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [year, unit])

  useEffect(load, [load])

  const factorsOf = useCallback((riskId: string) => data?.erm2.find(r => r.keyRiskId === riskId)?.factors ?? [], [data])

  const outline = useMemo(() => buildOutline(data), [data])
  const riskCount = countRisks(outline)

  const contextOf = (t: Target) => reportContext(data, t)

  const replaceRecord = (rec: Erm2Record) =>
    setData(d => d && { ...d, erm2: [...d.erm2.filter(r => r.keyRiskId !== rec.keyRiskId), rec] })

  const planOf = (factorId: string) => data?.erm3.find(r => r.factorId === factorId)

  const replacePlan = (rec: Erm3Record) =>
    setData(d => d && { ...d, erm3: [...d.erm3.filter(r => r.factorId !== rec.factorId), rec] })

  const riskBlock = (process: ProcessRecord, risk: KeyRisk, i: number) => {
    const factors = factorsOf(risk.id)
    const filled = stepsDone(factors).filter(Boolean).length
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
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <Tooltip title={filled === 4 ? 'กรอกครบทั้ง 4 ขั้นแล้ว' : `กรอกครบแล้ว ${filled} จาก 4 ขั้น`}>
              <Chip
                size='small'
                variant='tonal'
                color={filled === 4 ? 'success' : filled ? 'warning' : 'error'}
                label={filled === 4 ? 'ครบแล้ว' : `${filled}/4`}
              />
            </Tooltip>
            <Button
              size='small'
              variant='contained'
              onClick={() => setEditing(target)}
              startIcon={<i className='ri-save-line' />}
            >
              บันทึก ERM2
            </Button>
            <Button
              size='small'
              variant='contained'
              color='info'
              onClick={() => setReporting(target)}
              startIcon={<i className='ri-chat-1-line' />}
            >
              รายงาน ERM2
            </Button>
            <Button
              size='small'
              variant='outlined'
              onClick={() => exportErm2Word(factors, contextOf(target))}
              startIcon={<i className='ri-file-word-line' />}
            >
              Export Word
            </Button>
          </Box>
        </Box>
        {factors.map((f, j) => (
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
            {(() => {
              const filled3 = erm3StepsDone(planOf(f.id)).filter(Boolean).length

              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Tooltip
                    title={filled3 === 6 ? 'ERM3 กรอกครบทั้ง 6 ขั้นแล้ว' : `ERM3 กรอกแล้ว ${filled3} จาก 6 ขั้น`}
                  >
                    <Chip
                      size='small'
                      variant='tonal'
                      color={filled3 === 6 ? 'success' : filled3 ? 'warning' : 'error'}
                      label={filled3 === 6 ? 'ครบแล้ว' : `${filled3}/6`}
                    />
                  </Tooltip>
                  <Button
                    size='small'
                    variant='contained'
                    color={planOf(f.id) ? 'primary' : 'warning'}
                    onClick={() => setPlanning({ ...target, factor: f })}
                    startIcon={<i className='ri-calendar-check-line' />}
                  >
                    บันทึก ERM3
                  </Button>
                </Box>
              )
            })()}
          </Box>
        ))}
      </Box>
    )
  }

  const body = () => {
    if (loading && !data) return <TableSkeleton />
    if (error) return <ErrorState description={error} onRetry={load} />

    if (!outline.length)
      return (
        <EmptyState
          icon='ri-chat-search-line'
          title={`ยังไม่มี Key Risks ใน ERM1 ของปี ${year}`}
          description='ERM2 ใช้เหตุการณ์ความเสี่ยง (Key Risks) ที่บันทึกใน ERM1 ให้บันทึก ERM1 ของหน่วยงานนี้ก่อน'
          action={
            <Button component={Link} href='/risk/erm1' variant='contained'>
              ไปหน้า ERM1
            </Button>
          }
        />
      )

    return <RiskOutline outline={outline} renderRisk={riskBlock} />
  }

  return (
    <Box>
      <Box sx={{ mb: 5 }}>
        <Typography variant='h4' component='h1'>
          ERM2 - 3 : ประเมินความเสี่ยง
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          ปัจจัยเสี่ยงของแต่ละ Key Risk จาก ERM1 — การควบคุมที่มีอยู่ ระดับความเสี่ยง ณ เริ่มต้น (L × I)
          และความเสี่ยงที่เหลืออยู่
        </Typography>
      </Box>

      <Card sx={{ mb: 5 }} data-tour='erm2-filter'>
        <CardContent>
          <FilterBar fields={riskFilterFields} values={filter} onChange={setFilter} />
        </CardContent>
      </Card>

      <Card data-tour='erm2-tree'>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 3 }}>
            <Typography variant='h6' sx={{ flex: 1 }}>
              ความเสี่ยงและปัจจัยเสี่ยง
            </Typography>
            <LevelLegend />
            {data && <Chip size='small' color='primary' variant='outlined' label={`${riskCount} ความเสี่ยง`} />}
            <Button size='small' onClick={load} disabled={loading} startIcon={<i className='ri-refresh-line' />}>
              รีเฟรช
            </Button>
          </Box>
          {body()}
        </CardContent>
      </Card>

      {editing && (
        <Erm2Editor
          key={editing.risk.id}
          risk={editing.risk}
          factors={factorsOf(editing.risk.id)}
          context={contextOf(editing)}
          onClose={() => setEditing(null)}
          onSaved={replaceRecord}
        />
      )}

      {planning && (
        <Erm3Editor
          key={planning.factor.id}
          factor={planning.factor}
          keyRiskId={planning.risk.id}
          plan={planOf(planning.factor.id)}
          context={contextOf(planning)}
          onClose={() => setPlanning(null)}
          onSaved={replacePlan}
        />
      )}

      <Dialog
        open={!!reporting}
        onClose={() => setReporting(null)}
        maxWidth='xl'
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby='erm2-report-title'
      >
        {reporting && (
          <>
            <DialogTitle id='erm2-report-title' sx={{ paddingInlineEnd: 12 }}>
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

export default Erm2Page
