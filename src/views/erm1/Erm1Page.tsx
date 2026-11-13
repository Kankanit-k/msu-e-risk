'use client'

// ERM1 : วิเคราะห์สภาพแวดล้อมองค์กร — expandable tree SO › เป้าประสงค์ › กระบวนการดำเนินงาน(หลัก).
// SO and goals come from their own menus; this page adds processes and opens the 5-step ERM1 editor per process.
import { useCallback, useEffect, useMemo, useState } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
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
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FilterBar,
  FormDialog,
  TableSkeleton,
  notifyError,
  notifySuccess
} from '@/components/kit'
import type { FilterField, FilterValues, FormField } from '@/components/kit'
import { defaultYear } from '@/views/strategy/shared'

// Lib / Config Imports
import { apiBase, callApi } from '@/libs/callApi'
import { FISCAL_YEARS, UNITS } from '@/configs/units'
import { stepsDone } from '@/services/erm1Types'
import type { Erm1Tree, ProcessRecord } from '@/services/erm1Types'
import type { GoalRow } from '@/services/strategyTypes'

import Erm1Editor from './Erm1Editor'
import Erm1Report, { REPORT_TITLE, contextLines, exportErm1Word } from './Erm1Report'
import type { ReportContext } from './Erm1Report'

const API = `${apiBase}/api/erm1`

const filterFields: FilterField[] = [
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

const nameField: FormField[] = [
  {
    name: 'name',
    label: 'กระบวนการดำเนินงาน(หลัก)',
    type: 'textarea',
    required: true,
    validate: v => (v.trim().length < 3 ? 'อย่างน้อย 3 ตัวอักษร' : v.length > 500 ? 'ยาวเกิน 500 ตัวอักษร' : undefined)
  }
]

const ToggleButton = ({ open, label, onClick }: { open: boolean; label: string; onClick: () => void }) => (
  <IconButton size='small' aria-expanded={open} aria-label={`${open ? 'ยุบ' : 'ขยาย'} ${label}`} onClick={onClick}>
    <i className={open ? 'ri-subtract-line' : 'ri-add-line'} />
  </IconButton>
)

const HeadRow = ({ code, label }: { code: string; label: string }) => (
  <Box
    sx={{
      display: 'flex',
      gap: 3,
      px: 3,
      py: 1.5,
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
      fontWeight: 600,
      fontSize: '0.8125rem',
      borderRadius: 1
    }}
  >
    <Box sx={{ inlineSize: 88, flexShrink: 0, textAlign: 'center' }}>{code}</Box>
    <Box>{label}</Box>
  </Box>
)

const Erm1Page = () => {
  const fullScreen = useMediaQuery((t: Theme) => t.breakpoints.down('md'))
  const [filter, setFilter] = useState<FilterValues>({ year: defaultYear, unit: UNITS[0] })
  const [data, setData] = useState<Erm1Tree | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [naming, setNaming] = useState<{ goal: GoalRow; process?: ProcessRecord } | null>(null)
  const [deleting, setDeleting] = useState<ProcessRecord | null>(null)
  const [editing, setEditing] = useState<ProcessRecord | null>(null)
  const [reporting, setReporting] = useState<ProcessRecord | null>(null)
  const [busy, setBusy] = useState(false)

  const { year, unit } = filter

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    callApi<Erm1Tree>(`${API}?year=${year}&unit=${encodeURIComponent(unit)}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [year, unit])

  useEffect(load, [load])

  const goalsOf = useCallback((soId: string) => data?.goals.filter(g => g.soId === soId) ?? [], [data])

  const processesOf = useCallback((goalId: string) => data?.processes.filter(p => p.goalId === goalId) ?? [], [data])

  const allIds = useMemo(() => [...(data?.so.map(s => s.id) ?? []), ...(data?.goals.map(g => g.id) ?? [])], [data])
  const allOpen = allIds.length > 0 && allIds.every(id => open.has(id))

  const toggle = (id: string) =>
    setOpen(s => {
      const n = new Set(s)

      n.has(id) ? n.delete(id) : n.add(id)

      return n
    })

  const contextOf = (p: ProcessRecord): ReportContext => {
    const goal = data?.goals.find(g => g.id === p.goalId)

    return {
      year: p.year,
      unit: p.unit,
      so: goal ? `${goal.soCode} ${goal.soName}` : '—',
      goal: goal ? `${goal.code} ${goal.name}` : '—',
      process: p.name
    }
  }

  const replaceProcess = (rec: ProcessRecord) =>
    setData(d => d && { ...d, processes: d.processes.map(p => (p.id === rec.id ? rec : p)) })

  const saveName = async (v: Record<string, string>) => {
    if (!naming) return

    try {
      if (naming.process) {
        const rec = await callApi<ProcessRecord>(`${API}/${naming.process.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: v.name })
        })

        replaceProcess(rec)
        notifySuccess('แก้ไขชื่อกระบวนการแล้ว')
      } else {
        await callApi(API, {
          method: 'POST',
          body: JSON.stringify({ year: +year, unit, goalId: naming.goal.id, name: v.name })
        })
        notifySuccess('เพิ่มกระบวนการดำเนินงาน(หลัก) แล้ว')
        load()
      }
    } catch (e) {
      notifyError('บันทึกไม่สำเร็จ', e)
      throw e // keep the dialog open
    }
  }

  const remove = async () => {
    if (!deleting) return
    setBusy(true)

    try {
      await callApi(`${API}/${deleting.id}`, { method: 'DELETE' })
      notifySuccess('ลบกระบวนการแล้ว')
      setDeleting(null)
      load()
    } catch (e) {
      notifyError('ลบไม่สำเร็จ', e)
    } finally {
      setBusy(false)
    }
  }

  const processRow = (p: ProcessRecord, i: number) => {
    const filled = stepsDone(p).filter(Boolean).length
    const complete = filled === 4

    return (
      <Box
        key={p.id}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 2,
          px: 3,
          py: 2,
          borderBlockEnd: 1,
          borderColor: 'divider'
        }}
      >
        <Typography sx={{ inlineSize: 24, textAlign: 'center' }}>{i + 1}</Typography>
        <Typography sx={{ flex: '1 1 260px' }}>{p.name}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          <Tooltip title={complete ? 'กรอกครบทั้ง 4 ขั้นแล้ว' : `กรอกแล้ว ${filled} จาก 4 ขั้น`}>
            <Chip
              size='small'
              variant='tonal'
              color={complete ? 'success' : filled ? 'warning' : 'error'}
              label={complete ? 'ครบแล้ว' : `${filled}/4`}
            />
          </Tooltip>
          <Button
            size='small'
            variant='contained'
            onClick={() => setEditing(p)}
            startIcon={<i className='ri-save-line' />}
          >
            บันทึก
          </Button>
          <Button
            size='small'
            variant='contained'
            color='info'
            onClick={() => setReporting(p)}
            startIcon={<i className='ri-chat-1-line' />}
          >
            รายงาน
          </Button>
          <Button
            size='small'
            variant='outlined'
            onClick={() => exportErm1Word(p, contextOf(p))}
            startIcon={<i className='ri-file-word-line' />}
          >
            Export Word
          </Button>
          <IconButton
            size='small'
            aria-label={`แก้ไขชื่อ ${p.name}`}
            onClick={() => {
              const goal = data?.goals.find(g => g.id === p.goalId)

              if (goal) setNaming({ goal, process: p })
            }}
          >
            <i className='ri-pencil-line' style={{ color: 'var(--mui-palette-primary-main)' }} />
          </IconButton>
          <IconButton size='small' aria-label={`ลบ ${p.name}`} onClick={() => setDeleting(p)}>
            <i className='ri-delete-bin-line' style={{ color: 'var(--mui-palette-error-main)' }} />
          </IconButton>
        </Box>
      </Box>
    )
  }

  const goalBlock = (g: GoalRow) => {
    const list = processesOf(g.id)
    const isOpen = open.has(g.id)

    return (
      <Box key={g.id} sx={{ borderBlockEnd: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 3, py: 1.5 }}>
          <Box sx={{ inlineSize: 88, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToggleButton open={isOpen} label={`เป้าประสงค์ ${g.code}`} onClick={() => toggle(g.id)} />
            <Typography>{g.code}</Typography>
          </Box>
          <Typography sx={{ flex: 1 }}>{g.name}</Typography>
          <Chip
            size='small'
            variant='outlined'
            label={`${list.length} กระบวนการ`}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          />
        </Box>
        <Collapse in={isOpen} unmountOnExit>
          <Box sx={{ px: { xs: 1, md: 4 }, pb: 4 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
              <Typography variant='subtitle1' sx={{ fontWeight: 600, flex: 1 }}>
                เป้าประสงค์ {g.code} {g.name}
              </Typography>
              <Button
                size='small'
                variant='contained'
                onClick={() => setNaming({ goal: g })}
                startIcon={<i className='ri-add-line' />}
              >
                กระบวนการดำเนินงาน(หลัก)
              </Button>
            </Box>
            <HeadRow code='#' label='กระบวนการดำเนินงาน(หลัก) · บันทึก/รายงานการวิเคราะห์สภาพแวดล้อม' />
            {list.length ? (
              list.map(processRow)
            ) : (
              <Typography color='text.secondary' sx={{ p: 4, textAlign: 'center' }}>
                ยังไม่มีกระบวนการดำเนินงาน กดปุ่ม &quot;+ กระบวนการดำเนินงาน(หลัก)&quot; เพื่อเพิ่ม
              </Typography>
            )}
          </Box>
        </Collapse>
      </Box>
    )
  }

  const tree = () => {
    if (loading && !data) return <TableSkeleton />
    if (error) return <ErrorState description={error} onRetry={load} />

    if (!data?.so.length)
      return (
        <EmptyState
          icon='ri-star-line'
          title={`ยังไม่มีวัตถุประสงค์เชิงกลยุทธ์ (SO) ของปี ${year}`}
          description='ERM1 ใช้ SO และเป้าประสงค์ของหน่วยงาน ให้เพิ่มหรือนำเข้า SO ก่อน'
          action={
            <Button component={Link} href='/risk/so' variant='contained'>
              ไปหน้า SO
            </Button>
          }
        />
      )

    return (
      <>
        <HeadRow code='รหัส' label='วัตถุประสงค์เชิงกลยุทธ์' />
        {data.so.map(s => {
          const goals = goalsOf(s.id)
          const isOpen = open.has(s.id)

          return (
            <Box key={s.id} sx={{ borderBlockEnd: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 3, py: 2 }}>
                <Box sx={{ inlineSize: 88, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ToggleButton open={isOpen} label={s.code} onClick={() => toggle(s.id)} />
                  <Typography>{s.code}</Typography>
                </Box>
                <Typography sx={{ flex: 1 }}>{s.name}</Typography>
              </Box>
              <Collapse in={isOpen} unmountOnExit>
                <Box sx={{ paddingInlineStart: { xs: 1, md: 4 }, paddingInlineEnd: { xs: 1, md: 2 }, pb: 3 }}>
                  {goals.length ? (
                    <>
                      <HeadRow code='รหัส' label='เป้าประสงค์' />
                      {goals.map(goalBlock)}
                    </>
                  ) : (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <Typography color='text.secondary' sx={{ mb: 2 }}>
                        ยังไม่มีเป้าประสงค์ภายใต้ {s.code}
                      </Typography>
                      <Button component={Link} href='/risk/goals' size='small' variant='outlined'>
                        ไปหน้าเป้าประสงค์
                      </Button>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Box>
          )
        })}
      </>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 5 }}>
        <Typography variant='h4' component='h1'>
          ERM1 : วิเคราะห์สภาพแวดล้อมองค์กร
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          บริบทเกี่ยวกับหน่วยงาน (Organization Context) — PESTEL, McKinsey 7S, Situation Analysis และ Key Risks
        </Typography>
      </Box>

      <Card sx={{ mb: 5 }} data-tour='erm1-filter'>
        <CardContent>
          <FilterBar fields={filterFields} values={filter} onChange={setFilter} />
        </CardContent>
      </Card>

      <Card data-tour='erm1-tree'>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 3 }}>
            <Typography variant='h6' sx={{ flex: 1 }}>
              วัตถุประสงค์เชิงกลยุทธ์ › เป้าประสงค์ › กระบวนการ
            </Typography>
            {data && (
              <Chip size='small' color='primary' variant='outlined' label={`${data.processes.length} กระบวนการ`} />
            )}
            <Button
              size='small'
              disabled={!allIds.length}
              onClick={() => setOpen(allOpen ? new Set() : new Set(allIds))}
              startIcon={<i className={allOpen ? 'ri-contract-up-down-line' : 'ri-expand-up-down-line'} />}
            >
              {allOpen ? 'ยุบทั้งหมด' : 'ขยายทั้งหมด'}
            </Button>
            <Button size='small' onClick={load} disabled={loading} startIcon={<i className='ri-refresh-line' />}>
              รีเฟรช
            </Button>
          </Box>
          {tree()}
        </CardContent>
      </Card>

      <FormDialog
        open={!!naming}
        title={naming?.process ? 'แก้ไข : กระบวนการดำเนินงาน(หลัก)' : 'เพิ่ม : กระบวนการดำเนินงาน(หลัก)'}
        fields={nameField}
        initialValues={{ name: naming?.process?.name ?? '' }}
        draftKey={naming && !naming.process ? `draft:erm1:new:${naming.goal.id}` : undefined}
        submitLabel={naming?.process ? 'บันทึกการแก้ไข' : 'บันทึก'}
        onClose={() => setNaming(null)}
        onSubmit={saveName}
      />

      <ConfirmDialog
        open={!!deleting}
        title='ลบกระบวนการดำเนินงาน?'
        description={`"${deleting?.name ?? ''}" และข้อมูลวิเคราะห์ ERM1 ทั้งหมด (PESTEL, 7S, Situation Analysis, Key Risks) จะถูกลบ กู้คืนไม่ได้`}
        confirmLabel='ลบ'
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />

      {editing && (
        <Erm1Editor
          process={editing}
          context={contextOf(editing)}
          onClose={() => setEditing(null)}
          onSaved={replaceProcess}
        />
      )}

      <Dialog
        open={!!reporting}
        onClose={() => setReporting(null)}
        maxWidth='xl'
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby='erm1-report-title'
      >
        {reporting && (
          <>
            <DialogTitle id='erm1-report-title' sx={{ paddingInlineEnd: 12 }}>
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
              <Erm1Report analysis={reporting} />
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Button
                  variant='outlined'
                  onClick={() => exportErm1Word(reporting, contextOf(reporting))}
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

export default Erm1Page
