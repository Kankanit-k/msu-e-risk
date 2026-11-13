'use client'

// เป้าประสงค์ — list per fiscal year + unit (+ optional SO), add/edit/view/delete, copy from last year,
// and pick goals already entered in PMS. Each goal belongs to one SO of the same year + unit.
import { useCallback, useEffect, useMemo, useState } from 'react'

// MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

// Component Imports
import Link from '@/components/Link'
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterBar,
  FormDialog,
  notifyError,
  notifySuccess
} from '@/components/kit'
import type { Column, FilterField, FilterValues, FormField } from '@/components/kit'
import { PmsDialog, RowMenu, SourceChip, defaultYear, importMessage, thaiDate } from '@/views/strategy/shared'

// Lib / Config Imports
import { apiBase, callApi } from '@/libs/callApi'
import { FISCAL_YEARS, UNITS } from '@/configs/units'
import type { GoalRow, ImportResult, SoRecord, StrategyMode } from '@/services/strategyTypes'

const API = `${apiBase}/api/goals`
const SO_API = `${apiBase}/api/so`

const soLabel = (s: { code: string; name: string }) => `${s.code} - ${s.name}`

const GoalsPage = () => {
  const [filter, setFilter] = useState<FilterValues>({ year: defaultYear, unit: UNITS[0], so: '' })
  const [rows, setRows] = useState<GoalRow[]>([])
  const [soList, setSoList] = useState<SoRecord[]>([])
  const [mode, setMode] = useState<StrategyMode>('both')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<GoalRow | 'new' | null>(null)
  const [viewing, setViewing] = useState<GoalRow | null>(null)
  const [deleting, setDeleting] = useState<GoalRow | null>(null)
  const [copyAsk, setCopyAsk] = useState(false)
  const [pmsOpen, setPmsOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const { year, unit, so } = filter
  const canType = mode !== 'pms'
  const canPull = mode !== 'manual'
  const noSo = !loading && !error && soList.length === 0

  const load = useCallback(() => {
    const q = `year=${year}&unit=${encodeURIComponent(unit)}`

    setLoading(true)
    setError(null)
    Promise.all([
      callApi<{ items: GoalRow[]; mode: StrategyMode }>(`${API}?${q}`),
      callApi<{ items: SoRecord[] }>(`${SO_API}?${q}`)
    ])
      .then(([g, s]) => {
        setRows(g.items)
        setMode(g.mode)
        setSoList(s.items)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [year, unit])

  useEffect(load, [load])

  // Drop an SO filter that no longer exists in the newly chosen year/unit
  useEffect(() => {
    if (so && !loading && !soList.some(s => s.id === so)) setFilter(f => ({ ...f, so: '' }))
  }, [so, soList, loading])

  const soOptions = useMemo(() => soList.map(s => ({ value: s.id, label: soLabel(s) })), [soList])
  const shown = useMemo(() => (so ? rows.filter(r => r.soId === so) : rows), [rows, so])

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
    },
    { key: 'so', label: 'วัตถุประสงค์เชิงกลยุทธ์', type: 'autocomplete', options: soOptions, placeholder: 'ทั้งหมด' }
  ]

  const formFields: FormField[] = [
    { name: 'soId', label: 'วัตถุประสงค์เชิงกลยุทธ์', type: 'select', required: true, options: soOptions },
    {
      name: 'code',
      label: 'รหัสเป้าประสงค์',
      required: true,
      helperText: 'เช่น 1.1',
      validate: v => (v.trim().length > 20 ? 'รหัสยาวเกิน 20 ตัวอักษร' : undefined)
    },
    {
      name: 'name',
      label: 'ชื่อเป้าประสงค์',
      type: 'textarea',
      required: true,
      helperText: 'ระบุชื่อเป้าประสงค์ที่ชัดเจนและเจาะจง',
      validate: v => (v.trim().length < 3 ? 'อย่างน้อย 3 ตัวอักษร' : undefined)
    }
  ]

  const save = async (v: Record<string, string>) => {
    const body = { soId: v.soId, code: v.code, name: v.name }

    try {
      if (editing === 'new') {
        await callApi(API, { method: 'POST', body: JSON.stringify({ year: +year, unit, ...body }) })
        notifySuccess(`เพิ่มเป้าประสงค์ ${v.code} แล้ว`)
      } else if (editing) {
        await callApi(`${API}/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) })
        notifySuccess(`บันทึกเป้าประสงค์ ${v.code} แล้ว`)
      }

      load()
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
      notifySuccess(`ลบเป้าประสงค์ ${deleting.code} แล้ว`)
      setDeleting(null)
      load()
    } catch (e) {
      notifyError('ลบไม่สำเร็จ', e)
    } finally {
      setBusy(false)
    }
  }

  const copyLastYear = async () => {
    setBusy(true)

    try {
      const r = await callApi<ImportResult>(`${API}/import`, {
        method: 'POST',
        body: JSON.stringify({ from: 'lastYear', year: +year, unit })
      })

      notifySuccess(importMessage(r, `นำเข้าจากปี ${r.fromYear} แล้ว`))
      setCopyAsk(false)
      load()
    } catch (e) {
      notifyError('นำเข้าจากปีล่าสุดไม่สำเร็จ', e)
    } finally {
      setBusy(false)
    }
  }

  const columns: Column<GoalRow>[] = [
    { key: 'no', label: 'ลำดับ', render: r => shown.indexOf(r) + 1, hideOnMobile: true },
    {
      key: 'code',
      label: 'รหัสเป้าประสงค์',
      sortable: true,
      render: r => <Chip size='small' color='primary' variant='outlined' label={r.code} />
    },
    { key: 'name', label: 'ชื่อเป้าประสงค์', sortable: true },
    {
      key: 'soCode',
      label: 'วัตถุประสงค์',
      sortable: true,
      render: r => (
        <Tooltip title={r.soName}>
          <Chip size='small' color='info' variant='outlined' label={r.soCode} />
        </Tooltip>
      )
    },
    { key: 'source', label: 'ที่มา', render: r => <SourceChip source={r.source} />, hideOnMobile: true }
  ]

  const addButton = canType && (
    <Button
      variant='contained'
      disabled={noSo}
      onClick={() => setEditing('new')}
      startIcon={<i className='ri-add-line' />}
    >
      เพิ่มเป้าประสงค์ใหม่
    </Button>
  )

  return (
    <Box>
      <Box sx={{ mb: 5 }}>
        <Typography variant='h4' component='h1'>
          จัดการเป้าประสงค์
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          ระบบจัดการเป้าประสงค์สำหรับการบริหารความเสี่ยงองค์กร (ERM)
        </Typography>
      </Box>

      <Card sx={{ mb: 5 }} data-tour='goal-filter'>
        <CardContent>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 3, display: 'flex', gap: 1.5, alignItems: 'center' }}
          >
            <i className='ri-filter-3-line' /> ตัวกรองข้อมูล
          </Typography>
          <FilterBar
            fields={filterFields}
            values={filter}
            onChange={v => setFilter({ ...filter, ...v, so: v.so ?? '' })}
          />
        </CardContent>
      </Card>

      <Box
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'space-between', mb: 4 }}
        data-tour='goal-actions'
      >
        <Button variant='outlined' onClick={load} disabled={loading} startIcon={<i className='ri-refresh-line' />}>
          รีเฟรชข้อมูล
        </Button>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Button
            variant='outlined'
            color='secondary'
            onClick={() => setCopyAsk(true)}
            startIcon={<i className='ri-arrow-up-down-line' />}
          >
            นำเข้าจากปีล่าสุด
          </Button>
          {canPull && (
            <Button
              variant='outlined'
              onClick={() => setPmsOpen(true)}
              startIcon={<i className='ri-cloud-download-line' />}
            >
              ดึงจาก PMS
            </Button>
          )}
          {addButton}
        </Box>
      </Box>

      {noSo && (
        <Alert
          severity='warning'
          sx={{ mb: 4 }}
          action={
            <Button component={Link} href='/risk/so' color='inherit' size='small'>
              ไปหน้า SO
            </Button>
          }
        >
          ยังไม่มีวัตถุประสงค์เชิงกลยุทธ์ (SO) ของปี {year} · {unit} ต้องเพิ่มหรือนำเข้า SO ก่อนจึงจะเพิ่มเป้าประสงค์ได้
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 3 }}>
            <Typography variant='h6'>รายการเป้าประสงค์</Typography>
            <Chip size='small' color='primary' variant='outlined' label={`${shown.length} รายการ`} />
          </Box>
          <DataTable
            rows={shown}
            columns={columns}
            getRowId={r => r.id}
            loading={loading}
            error={error}
            onRetry={load}
            resetKey={`${year}|${unit}|${so}`}
            onRowClick={setViewing}
            actions={r => (
              <RowMenu
                label={r.code}
                source={r.source}
                canEdit={canType}
                onView={() => setViewing(r)}
                onEdit={() => setEditing(r)}
                onDelete={() => setDeleting(r)}
              />
            )}
            empty={
              <EmptyState
                icon='ri-focus-3-line'
                title='ไม่พบข้อมูลเป้าประสงค์'
                description='กรุณาตรวจสอบตัวกรองหรือเพิ่มข้อมูลใหม่'
                action={addButton || undefined}
              />
            }
          />
        </CardContent>
      </Card>

      <FormDialog
        open={!!editing}
        title={editing === 'new' ? 'เพิ่มเป้าประสงค์ใหม่' : 'แก้ไขเป้าประสงค์'}
        fields={formFields}
        initialValues={
          editing && editing !== 'new'
            ? { soId: editing.soId, code: editing.code, name: editing.name }
            : { soId: so, code: '', name: '' }
        }
        draftKey={editing === 'new' ? `draft:goal:new:${year}:${unit}` : undefined}
        submitLabel={editing === 'new' ? 'บันทึก' : 'บันทึกการแก้ไข'}
        onClose={() => setEditing(null)}
        onSubmit={save}
      />

      <Dialog
        open={!!viewing}
        onClose={() => setViewing(null)}
        maxWidth='sm'
        fullWidth
        aria-labelledby='goal-view-title'
      >
        {viewing && (
          <>
            <DialogTitle id='goal-view-title'>เป้าประสงค์ {viewing.code}</DialogTitle>
            <DialogContent dividers>
              <Box
                component='dl'
                sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '150px 1fr' }, gap: '10px 16px', m: 0 }}
              >
                {(
                  [
                    ['วัตถุประสงค์เชิงกลยุทธ์', soLabel({ code: viewing.soCode, name: viewing.soName })],
                    ['รหัสเป้าประสงค์', viewing.code],
                    ['ชื่อเป้าประสงค์', viewing.name],
                    ['ปีงบประมาณ', String(viewing.year)],
                    ['คณะ / หน่วยงาน', viewing.unit],
                    ['ที่มา', <SourceChip key='s' source={viewing.source} />],
                    ['วันที่สร้าง', thaiDate(viewing.createdAt)]
                  ] as const
                ).flatMap(([k, v]) => [
                  <Typography key={`k${k}`} component='dt' color='text.secondary'>
                    {k}
                  </Typography>,
                  <Box key={`v${k}`} component='dd' sx={{ m: 0 }}>
                    {v}
                  </Box>
                ])}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewing(null)}>ปิด</Button>
              {canType && viewing.source === 'manual' && (
                <Button
                  variant='contained'
                  onClick={() => (setEditing(viewing), setViewing(null))}
                  startIcon={<i className='ri-pencil-line' />}
                >
                  แก้ไข
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        title={`ลบเป้าประสงค์ ${deleting?.code ?? ''}?`}
        description={
          deleting?.source === 'pms'
            ? 'ลบรายการนี้ออกจากระบบ e-Risk เท่านั้น ข้อมูลในระบบ PMS ไม่เปลี่ยนแปลง และดึงกลับมาใหม่ได้'
            : 'ลบแล้วกู้คืนไม่ได้'
        }
        confirmLabel='ลบ'
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={copyAsk}
        color='primary'
        title='นำเข้าจากปีล่าสุด?'
        description={`คัดลอกเป้าประสงค์ของปีงบประมาณล่าสุดก่อนปี ${year} ของ "${unit}" มาไว้ในปี ${year} โดยผูกกับ SO รหัสเดียวกันในปีนี้ รายการที่ไม่มี SO รหัสเดียวกัน หรือรหัสซ้ำ จะถูกข้าม`}
        confirmLabel='นำเข้า'
        busy={busy}
        onConfirm={copyLastYear}
        onCancel={() => setCopyAsk(false)}
      />

      <PmsDialog
        open={pmsOpen}
        title='เลือกเป้าประสงค์จากระบบ PMS'
        api={API}
        year={year}
        unit={unit}
        onClose={() => setPmsOpen(false)}
        onImported={load}
      />
    </Box>
  )
}

export default GoalsPage
