'use client'

// Pieces shared by the SO and เป้าประสงค์ pages: row "⋮" menu, source chip, and the PMS picker dialog.
import { useCallback, useEffect, useState } from 'react'

// MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

// Component Imports
import { EmptyState, notifyError, notifySuccess } from '@/components/kit'

// Lib Imports
import { callApi } from '@/libs/callApi'
import { FISCAL_YEARS, currentFiscalYear } from '@/configs/units'
import type { ImportResult, PmsItem, Source } from '@/services/strategyTypes'

export const defaultYear = String(
  Math.min(Math.max(currentFiscalYear(), FISCAL_YEARS[0]), FISCAL_YEARS[FISCAL_YEARS.length - 1])
)

export const thaiDate = (iso: string) =>
  new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

export const SourceChip = ({ source }: { source: Source }) =>
  source === 'pms' ? (
    <Chip size='small' color='info' variant='tonal' label='PMS' />
  ) : (
    <Chip size='small' variant='outlined' label='กรอกเอง' />
  )

export const importMessage = (r: ImportResult, what: string) =>
  `${what} ${r.added.length} รายการ${r.skipped.length ? ` (ข้าม ${r.skipped.join(', ')})` : ''}`

// ── Row "⋮" menu ────────────────────────────────────────────────────

type RowMenuProps = {
  label: string
  source: Source
  canEdit: boolean
  onView?: () => void
  onEdit: () => void
  onDelete: () => void
}

export const RowMenu = ({ label, source, canEdit, onView, onEdit, onDelete }: RowMenuProps) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const pmsLocked = source === 'pms'
  const run = (fn: () => void) => () => (setAnchor(null), fn())

  return (
    <>
      <IconButton aria-label={`การจัดการ ${label}`} onClick={e => setAnchor(e.currentTarget)}>
        <i className='ri-more-2-fill' />
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {onView && (
          <MenuItem onClick={run(onView)}>
            <ListItemIcon>
              <i className='ri-eye-line' />
            </ListItemIcon>
            ดูข้อมูล
          </MenuItem>
        )}
        <Tooltip title={pmsLocked ? 'รายการที่ดึงจาก PMS ต้องแก้ไขที่ระบบ PMS' : ''} placement='left'>
          <span>
            <MenuItem disabled={pmsLocked || !canEdit} onClick={run(onEdit)}>
              <ListItemIcon>
                <i className='ri-pencil-line' style={{ color: 'var(--mui-palette-primary-main)' }} />
              </ListItemIcon>
              แก้ไข
            </MenuItem>
          </span>
        </Tooltip>
        <MenuItem onClick={run(onDelete)}>
          <ListItemIcon>
            <i className='ri-delete-bin-line' style={{ color: 'var(--mui-palette-error-main)' }} />
          </ListItemIcon>
          ลบ
        </MenuItem>
      </Menu>
    </>
  )
}

// ── PMS picker ──────────────────────────────────────────────────────

type PmsDialogProps = {
  open: boolean
  title: string

  /** e.g. `${apiBase}/api/so` — the dialog calls `${api}/pms` and `${api}/import`. */
  api: string
  year: string
  unit: string
  onClose: () => void
  onImported: () => void
}

export const PmsDialog = ({ open, title, api, year, unit, onClose, onImported }: PmsDialogProps) => {
  const [data, setData] = useState<{ items: PmsItem[]; mock: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setData(null)
    setError(null)
    setPicked([])
    callApi<{ items: PmsItem[]; mock: boolean }>(`${api}/pms?year=${year}&unit=${encodeURIComponent(unit)}`)
      .then(setData)
      .catch(e => setError(e.message))
  }, [api, year, unit])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const available = data?.items.filter(x => !x.imported && !x.blockedReason) ?? []
  const allPicked = available.length > 0 && picked.length === available.length
  const toggle = (id: string) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))

  const submit = async () => {
    setBusy(true)

    try {
      const r = await callApi<ImportResult>(`${api}/import`, {
        method: 'POST',
        body: JSON.stringify({ from: 'pms', year: +year, unit, pmsIds: picked })
      })

      notifySuccess(importMessage(r, 'นำเข้าจาก PMS'))
      onImported()
      onClose()
    } catch (e) {
      notifyError('นำเข้าจาก PMS ไม่สำเร็จ', e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth='md' fullWidth aria-labelledby='pms-title'>
      <DialogTitle id='pms-title'>
        {title}
        <Typography variant='body2' color='text.secondary'>
          ปีงบประมาณ {year} · {unit}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {data?.mock && (
          <Alert severity='warning' sx={{ mb: 3 }}>
            ยังไม่ได้เชื่อมต่อระบบ PMS จริง รายการด้านล่างเป็นข้อมูลตัวอย่าง (ตั้งค่า PMS_API_URL ใน .env
            เพื่อเชื่อมต่อ)
          </Alert>
        )}
        {error ? (
          <Alert
            severity='error'
            action={
              <Button color='inherit' size='small' onClick={load}>
                ลองใหม่
              </Button>
            }
          >
            {error}
          </Alert>
        ) : !data ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress aria-label='กำลังโหลดข้อมูลจาก PMS' />
          </Box>
        ) : data.items.length === 0 ? (
          <EmptyState
            icon='ri-inbox-line'
            title='ไม่พบข้อมูลใน PMS'
            description='PMS ยังไม่มีรายการของหน่วยงานนี้ในปีงบประมาณที่เลือก'
          />
        ) : (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant='body2' color='text.secondary'>
                เลือกแล้ว {picked.length} จาก {available.length} รายการที่นำเข้าได้
              </Typography>
              <Button
                size='small'
                disabled={!available.length}
                onClick={() => setPicked(allPicked ? [] : available.map(x => x.pmsId))}
              >
                {allPicked ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
              </Button>
            </Box>
            <List dense>
              {data.items.map(x => (
                <ListItemButton
                  key={x.pmsId}
                  disabled={x.imported || !!x.blockedReason}
                  onClick={() => toggle(x.pmsId)}
                >
                  <ListItemIcon>
                    <Checkbox
                      edge='start'
                      checked={x.imported || picked.includes(x.pmsId)}
                      tabIndex={-1}
                      inputProps={{ 'aria-label': x.code }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${x.code} — ${x.name}`}
                    secondary={
                      x.soCode ? `ภายใต้ ${x.soCode}${x.blockedReason ? ` · ${x.blockedReason}` : ''}` : undefined
                    }
                  />
                  {x.imported && <Chip size='small' label='นำเข้าแล้ว' color='success' variant='tonal' />}
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          ยกเลิก
        </Button>
        <Button
          variant='contained'
          onClick={submit}
          disabled={!picked.length || busy}
          startIcon={busy ? <CircularProgress size={16} color='inherit' /> : <i className='ri-download-2-line' />}
        >
          นำเข้า {picked.length || ''} รายการ
        </Button>
      </DialogActions>
    </Dialog>
  )
}
