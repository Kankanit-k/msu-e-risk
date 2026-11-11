'use client'

// /requests — reference page for the UI kit (src/components/kit) and the approval workflow:
// list + FilterBar + export/print, create/edit in a FormDialog, draft → submitted → approved/rejected.
import { useCallback, useEffect, useMemo, useState } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

// Component Imports
import { DataTable, EmptyState, FilterBar, FormDialog, PrintReport, notifyError, notifySuccess } from '@/components/kit'
import type { Column, FilterField, FilterValues, FormField, FormValues, ReportColumn } from '@/components/kit'
import { downloadXLSX } from '@/libs/export/xlsx'
import type { XlsxColumn } from '@/libs/export/xlsx'
import { categories, categoryLabel, statusColor, statusLabel } from '@/services/requestTypes'
import type { RequestRecord, RequestStatus } from '@/services/requestTypes'

import RequestDetail from './RequestDetail'
import { api, callApi } from './api'

const baht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const thaiDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '')

const statusOptions = (Object.keys(statusLabel) as RequestStatus[]).map(s => ({ value: s, label: statusLabel[s] }))

const filterFields: FilterField[] = [
  { key: 'q', label: 'ค้นหา', type: 'search', placeholder: 'ชื่อคำขอหรือผู้ยื่น' },
  { key: 'status', label: 'สถานะ', type: 'select', options: statusOptions },
  { key: 'category', label: 'ประเภท', type: 'select', options: categories },
  { key: 'from', label: 'ต้องการตั้งแต่', type: 'date' },
  { key: 'to', label: 'ต้องการถึง', type: 'date' }
]

const applyFilters = (rows: RequestRecord[], f: FilterValues) => {
  const q = f.q?.trim().toLowerCase()

  return rows.filter(
    r =>
      (!q || r.title.toLowerCase().includes(q) || r.requesterName.toLowerCase().includes(q)) &&
      (!f.status || r.status === f.status) &&
      (!f.category || r.category === f.category) &&
      (!f.from || r.neededBy >= f.from) &&
      (!f.to || r.neededBy <= f.to)
  )
}

const today = () => new Date().toISOString().slice(0, 10)

const formFields: FormField[] = [
  { name: 'title', label: 'ชื่อคำขอ', required: true, validate: v => (v.trim().length < 3 ? 'อย่างน้อย 3 ตัวอักษร' : undefined) },
  { name: 'category', label: 'ประเภท', type: 'select', required: true, options: categories },
  {
    name: 'amount',
    label: 'จำนวนเงิน (บาท)',
    type: 'number',
    required: true,
    validate: v => (!(Number(v) > 0) ? 'ต้องเป็นตัวเลขมากกว่า 0' : undefined)
  },
  {
    name: 'neededBy',
    label: 'วันที่ต้องการ',
    type: 'date',
    required: true,
    validate: v => (v < today() ? 'ต้องไม่เป็นวันที่ผ่านมาแล้ว' : undefined)
  },
  { name: 'detail', label: 'รายละเอียด', type: 'textarea', helperText: 'ไม่บังคับ' }
]

const emptyForm: FormValues = { title: '', category: '', amount: '', neededBy: '', detail: '' }

const toForm = (r: RequestRecord): FormValues => ({
  title: r.title,
  category: r.category,
  amount: String(r.amount),
  neededBy: r.neededBy,
  detail: r.detail
})

const exportColumns: XlsxColumn<RequestRecord>[] = [
  { label: 'ชื่อคำขอ', value: r => r.title, width: 36 },
  { label: 'ประเภท', value: r => categoryLabel(r.category) },
  { label: 'จำนวนเงิน (บาท)', value: r => r.amount, width: 16 },
  { label: 'วันที่ต้องการ', value: r => r.neededBy, width: 14 },
  { label: 'ผู้ยื่น', value: r => r.requesterName, width: 24 },
  { label: 'สถานะ', value: r => statusLabel[r.status], width: 14 },
  { label: 'รายละเอียด', value: r => r.detail, width: 40 }
]

const reportColumns: ReportColumn<RequestRecord>[] = [
  { label: 'ชื่อคำขอ', value: r => r.title },
  { label: 'ประเภท', value: r => categoryLabel(r.category) },
  { label: 'จำนวนเงิน (บาท)', value: r => baht(r.amount), align: 'right' },
  { label: 'วันที่ต้องการ', value: r => thaiDate(r.neededBy) },
  { label: 'ผู้ยื่น', value: r => r.requesterName },
  { label: 'สถานะ', value: r => statusLabel[r.status] }
]

type ListResponse = { items: RequestRecord[]; canApprove: boolean; userId: string }

const Requests = () => {
  const [data, setData] = useState<ListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterValues>({})
  const [editing, setEditing] = useState<RequestRecord | 'new' | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)

    try {
      setData(await callApi<ListResponse>(api))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => applyFilters(data?.items ?? [], filters), [data, filters])
  const selected = data?.items.find(r => r.id === selectedId) ?? null

  const replace = (rec: RequestRecord) =>
    setData(d => d && { ...d, items: d.items.some(r => r.id === rec.id) ? d.items.map(r => (r.id === rec.id ? rec : r)) : [rec, ...d.items] })

  const save = async (v: FormValues) => {
    const isNew = editing === 'new'

    try {
      const rec = await callApi<RequestRecord>(isNew ? api : `${api}/${(editing as RequestRecord).id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify({ ...v, amount: Number(v.amount) })
      })

      replace(rec)
      notifySuccess(isNew ? 'บันทึกร่างคำขอแล้ว' : 'บันทึกการแก้ไขแล้ว')
    } catch (err) {
      notifyError('บันทึกไม่สำเร็จ', err)
      throw err
    }
  }

  const exportXlsx = () => {
    downloadXLSX(rows, exportColumns, `คำขอ-${today()}`)
    notifySuccess(`ส่งออก ${rows.length} รายการ`)
  }

  const activeFilterText = filterFields
    .filter(f => filters[f.key])
    .map(f => `${f.label}: ${f.options?.find(o => o.value === filters[f.key])?.label ?? filters[f.key]}`)

  const columns: Column<RequestRecord>[] = [
    { key: 'title', label: 'ชื่อคำขอ', sortable: true },
    { key: 'category', label: 'ประเภท', render: r => categoryLabel(r.category), hideOnMobile: true },
    { key: 'amount', label: 'จำนวนเงิน (บาท)', align: 'right', sortable: true, render: r => baht(r.amount) },
    { key: 'neededBy', label: 'วันที่ต้องการ', sortable: true, render: r => thaiDate(r.neededBy), hideOnMobile: true },
    { key: 'requesterName', label: 'ผู้ยื่น', sortable: true, hideOnMobile: true },
    {
      key: 'status',
      label: 'สถานะ',
      sortable: true,
      sortValue: r => statusLabel[r.status],
      render: r => <Chip size='small' variant='tonal' color={statusColor[r.status]} label={statusLabel[r.status]} />
    }
  ]

  const createButton = (
    <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={() => setEditing('new')} data-tour='requests-create'>
      สร้างคำขอ
    </Button>
  )

  return (
    <>
      <Card className='no-print'>
        <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
          <Box sx={{ flex: '1 1 240px' }}>
            <Typography variant='h5'>คำขอ</Typography>
            <Typography color='text.secondary'>ยื่นคำขอ ติดตามสถานะ และอนุมัติคำขอ</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }} data-tour='requests-export'>
            <Button variant='outlined' color='secondary' startIcon={<i className='ri-file-excel-2-line' />} onClick={exportXlsx} disabled={!rows.length}>
              ส่งออก Excel
            </Button>
            <Button variant='outlined' color='secondary' startIcon={<i className='ri-printer-line' />} onClick={() => window.print()} disabled={!rows.length}>
              พิมพ์รายงาน
            </Button>
            {createButton}
          </Box>
        </CardContent>
        <Divider />
        <CardContent data-tour='requests-filter'>
          <FilterBar fields={filterFields} values={filters} onChange={setFilters} />
        </CardContent>
        <Divider />
        <Box data-tour='requests-table'>
          <DataTable
            rows={rows}
            columns={columns}
            getRowId={r => r.id}
            loading={!data && !error}
            error={error}
            onRetry={load}
            resetKey={JSON.stringify(filters)}
            initialSort={{ key: 'neededBy', dir: 'asc' }}
            onRowClick={r => setSelectedId(r.id)}
            empty={
              data?.items.length ? (
                <EmptyState icon='ri-filter-off-line' title='ไม่พบคำขอที่ตรงกับตัวกรอง' action={<Button onClick={() => setFilters({})}>ล้างตัวกรอง</Button>} />
              ) : (
                <EmptyState title='ยังไม่มีคำขอ' description='เริ่มจากสร้างคำขอแรก ระบบจะบันทึกเป็นร่างจนกว่าคุณจะกดส่ง' action={createButton} />
              )
            }
          />
        </Box>
      </Card>

      <PrintReport
        title='รายงานคำขอ'
        meta={activeFilterText.length ? [`ตัวกรอง — ${activeFilterText.join(', ')}`] : []}
        rows={rows}
        columns={reportColumns}
        getRowId={r => r.id}
        footer={<p>รวม {rows.length} รายการ เป็นเงิน {baht(rows.reduce((s, r) => s + r.amount, 0))} บาท</p>}
      />

      <FormDialog
        open={editing !== null}
        title={editing === 'new' ? 'สร้างคำขอ' : 'แก้ไขคำขอ'}
        fields={formFields}
        initialValues={editing && editing !== 'new' ? toForm(editing) : emptyForm}
        draftKey={editing === 'new' ? 'draft:requests:new' : editing ? `draft:requests:${editing.id}` : undefined}
        submitLabel='บันทึกร่าง'
        onClose={() => setEditing(null)}
        onSubmit={save}
      />

      <RequestDetail
        request={selected}
        canApprove={!!data?.canApprove}
        isOwner={selected?.requesterId === data?.userId}
        onClose={() => setSelectedId(null)}
        onEdit={r => {
          setSelectedId(null)
          setEditing(r)
        }}
        onChanged={replace}
      />
    </>
  )
}

export default Requests
