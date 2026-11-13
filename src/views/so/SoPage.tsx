'use client'

// SO (วัตถุประสงค์เชิงกลยุทธ์) — list per fiscal year + unit, add/edit/delete, copy from last year,
// and pick SO already entered in PMS. Which of "type here" / "pull from PMS" is offered depends on
// STRATEGY_SOURCE (see services/strategyTypes.ts) — both by default until the PMS agreement is settled.
import { useCallback, useEffect, useMemo, useState } from 'react'

// MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Component Imports
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
import type { ImportResult, SoRecord, StrategyMode } from '@/services/strategyTypes'

const API = `${apiBase}/api/so`

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

const formFields: FormField[] = [
  {
    name: 'code',
    label: 'รหัสวัตถุประสงค์',
    required: true,
    helperText: 'เช่น SO1',
    validate: v => (v.trim().length > 20 ? 'รหัสยาวเกิน 20 ตัวอักษร' : undefined)
  },
  {
    name: 'name',
    label: 'ชื่อวัตถุประสงค์เชิงกลยุทธ์',
    type: 'textarea',
    required: true,
    validate: v => (v.trim().length < 3 ? 'อย่างน้อย 3 ตัวอักษร' : undefined)
  }
]

const SoPage = () => {
  const [filter, setFilter] = useState<FilterValues>({ year: defaultYear, unit: UNITS[0] })
  const [rows, setRows] = useState<SoRecord[]>([])
  const [mode, setMode] = useState<StrategyMode>('both')
  const [pmsLive, setPmsLive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<SoRecord | 'new' | null>(null)
  const [deleting, setDeleting] = useState<SoRecord | null>(null)
  const [copyAsk, setCopyAsk] = useState(false)
  const [pmsOpen, setPmsOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const { year, unit } = filter
  const canType = mode !== 'pms'
  const canPull = mode !== 'manual'

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    callApi<{ items: SoRecord[]; mode: StrategyMode; pmsLive: boolean }>(
      `${API}?year=${year}&unit=${encodeURIComponent(unit)}`
    )
      .then(d => {
        setRows(d.items)
        setMode(d.mode)
        setPmsLive(d.pmsLive)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [year, unit])

  useEffect(load, [load])

  const save = async (v: Record<string, string>) => {
    try {
      if (editing === 'new') {
        await callApi(API, { method: 'POST', body: JSON.stringify({ year: +year, unit, code: v.code, name: v.name }) })
        notifySuccess(`เพิ่ม ${v.code} แล้ว`)
      } else if (editing) {
        await callApi(`${API}/${editing.id}`, { method: 'PUT', body: JSON.stringify({ code: v.code, name: v.name }) })
        notifySuccess(`บันทึก ${v.code} แล้ว`)
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
      notifySuccess(`ลบ ${deleting.code} แล้ว`)
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

  const columns: Column<SoRecord>[] = useMemo(
    () => [
      {
        key: 'code',
        label: 'รหัส',
        sortable: true,
        sortValue: r => r.code,
        render: r => <Chip size='small' color='primary' variant='outlined' label={r.code} />
      },
      { key: 'name', label: 'ชื่อวัตถุประสงค์เชิงกลยุทธ์', sortable: true },
      { key: 'source', label: 'ที่มา', render: r => <SourceChip source={r.source} /> },
      { key: 'createdAt', label: 'วันที่สร้าง', sortable: true, hideOnMobile: true, render: r => thaiDate(r.createdAt) }
    ],
    []
  )

  return (
    <Box>
      <Box sx={{ mb: 5 }}>
        <Typography variant='h4' component='h1'>
          จัดการวัตถุประสงค์เชิงกลยุทธ์
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          ระบบจัดการวัตถุประสงค์เชิงกลยุทธ์สำหรับการบริหารความเสี่ยงองค์กร (ERM)
        </Typography>
      </Box>

      <Card sx={{ mb: 5 }} data-tour='so-filter'>
        <CardContent>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 3, display: 'flex', gap: 1.5, alignItems: 'center' }}
          >
            <i className='ri-filter-3-line' /> ตัวกรองข้อมูล
          </Typography>
          <FilterBar fields={filterFields} values={filter} onChange={v => setFilter({ ...filter, ...v })} />
        </CardContent>
      </Card>

      <Box
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'space-between', mb: 4 }}
        data-tour='so-actions'
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
          {canType && (
            <Button variant='contained' onClick={() => setEditing('new')} startIcon={<i className='ri-add-line' />}>
              เพิ่มวัตถุประสงค์ใหม่
            </Button>
          )}
        </Box>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 3 }}>
            <Typography variant='h6'>รายการวัตถุประสงค์เชิงกลยุทธ์</Typography>
            <Chip size='small' color='primary' variant='outlined' label={`${rows.length} รายการ`} />
          </Box>
          {canPull && !pmsLive && (
            <Alert severity='info' sx={{ mb: 3 }}>
              ยังไม่ได้เชื่อมต่อระบบ PMS ปุ่ม &quot;ดึงจาก PMS&quot; จะแสดงข้อมูลตัวอย่างไปก่อน
            </Alert>
          )}
          {mode === 'pms' && (
            <Alert severity='info' sx={{ mb: 3 }}>
              ระบบตั้งค่าให้ใช้ SO จาก PMS เท่านั้น หากต้องการเพิ่มหรือแก้ไข SO กรุณาดำเนินการที่ระบบ PMS
            </Alert>
          )}
          <DataTable
            rows={rows}
            columns={columns}
            getRowId={r => r.id}
            loading={loading}
            error={error}
            onRetry={load}
            resetKey={`${year}|${unit}`}
            initialSort={{ key: 'code', dir: 'asc' }}
            actions={r => (
              <RowMenu
                label={r.code}
                source={r.source}
                canEdit={canType}
                onEdit={() => setEditing(r)}
                onDelete={() => setDeleting(r)}
              />
            )}
            empty={
              <EmptyState
                icon='ri-star-line'
                title='ยังไม่มีวัตถุประสงค์เชิงกลยุทธ์'
                description={`ปีงบประมาณ ${year} · ${unit}`}
                action={
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {canPull && (
                      <Button variant='outlined' onClick={() => setPmsOpen(true)}>
                        ดึงจาก PMS
                      </Button>
                    )}
                    {canType && (
                      <Button variant='contained' onClick={() => setEditing('new')}>
                        เพิ่มวัตถุประสงค์ใหม่
                      </Button>
                    )}
                  </Box>
                }
              />
            }
          />
        </CardContent>
      </Card>

      <FormDialog
        open={!!editing}
        title={editing === 'new' ? 'เพิ่มวัตถุประสงค์เชิงกลยุทธ์' : 'แก้ไขวัตถุประสงค์เชิงกลยุทธ์'}
        fields={formFields}
        initialValues={
          editing && editing !== 'new' ? { code: editing.code, name: editing.name } : { code: '', name: '' }
        }
        draftKey={editing === 'new' ? `draft:so:new:${year}:${unit}` : undefined}
        submitLabel='บันทึก'
        onClose={() => setEditing(null)}
        onSubmit={save}
      />

      <ConfirmDialog
        open={!!deleting}
        title={`ลบ ${deleting?.code ?? ''}?`}
        description={
          deleting?.source === 'pms'
            ? 'ลบรายการนี้ออกจากระบบ e-Risk เท่านั้น ข้อมูลในระบบ PMS ไม่เปลี่ยนแปลง และดึงกลับมาใหม่ได้'
            : 'ลบแล้วกู้คืนไม่ได้ ถ้ายังมีเป้าประสงค์อยู่ภายใต้ SO นี้ ระบบจะไม่ให้ลบจนกว่าจะลบเป้าประสงค์เหล่านั้นก่อน'
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
        description={`คัดลอก SO ของปีงบประมาณล่าสุดก่อนปี ${year} ของ "${unit}" มาไว้ในปี ${year} รายการที่รหัสซ้ำกับที่มีอยู่จะถูกข้าม`}
        confirmLabel='นำเข้า'
        busy={busy}
        onConfirm={copyLastYear}
        onCancel={() => setCopyAsk(false)}
      />

      <PmsDialog
        open={pmsOpen}
        title='เลือก SO จากระบบ PMS'
        api={API}
        year={year}
        unit={unit}
        onClose={() => setPmsOpen(false)}
        onImported={load}
      />
    </Box>
  )
}

export default SoPage
