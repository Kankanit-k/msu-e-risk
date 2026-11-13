'use client'

// One request: status stepper, details, history, and the actions the viewer is allowed to take.
import { useState } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// Component Imports
import { ConfirmDialog, notifyError, notifySuccess } from '@/components/kit'
import { categoryLabel, statusLabel } from '@/services/requestTypes'
import type { RequestAction, RequestRecord } from '@/services/requestTypes'

import { api, callApi } from './api'

type Props = {
  request: RequestRecord | null
  canApprove: boolean
  isOwner: boolean
  onClose: () => void
  onEdit: (r: RequestRecord) => void
  onChanged: (r: RequestRecord) => void
}

const actionText: Record<
  RequestAction,
  { title: string; body: string; label: string; done: string; color: 'primary' | 'error' }
> = {
  submit: {
    title: 'ส่งคำขอเพื่ออนุมัติ?',
    body: 'หลังส่งแล้วจะแก้ไขคำขอนี้ไม่ได้',
    label: 'ส่งคำขอ',
    done: 'ส่งคำขอแล้ว',
    color: 'primary'
  },
  approve: {
    title: 'อนุมัติคำขอนี้?',
    body: 'ผู้ยื่นจะได้รับแจ้งผล และเปลี่ยนกลับไม่ได้',
    label: 'อนุมัติ',
    done: 'อนุมัติแล้ว',
    color: 'primary'
  },
  reject: {
    title: 'ไม่อนุมัติคำขอนี้?',
    body: 'ระบุเหตุผลให้ผู้ยื่นทราบ',
    label: 'ไม่อนุมัติ',
    done: 'บันทึกผลไม่อนุมัติแล้ว',
    color: 'error'
  }
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '140px 1fr' }, gap: { xs: 0, sm: 3 }, py: 1 }}>
    <Typography color='text.secondary'>{label}</Typography>
    <Typography sx={{ whiteSpace: 'pre-wrap' }}>{children}</Typography>
  </Box>
)

const RequestDetail = ({ request: r, canApprove, isOwner, onClose, onEdit, onChanged }: Props) => {
  const [pending, setPending] = useState<RequestAction | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (!r || !pending) return
    setBusy(true)

    try {
      onChanged(
        await callApi<RequestRecord>(`${api}/${r.id}`, {
          method: 'POST',
          body: JSON.stringify({ action: pending, note: note || undefined })
        })
      )
      notifySuccess(actionText[pending].done)
      setPending(null)
      setNote('')
    } catch (err) {
      notifyError('ดำเนินการไม่สำเร็จ', err)
    } finally {
      setBusy(false)
    }
  }

  const finalStep = r?.status === 'rejected' ? 'ไม่อนุมัติ' : 'อนุมัติ'
  const activeStep = !r ? 0 : r.status === 'draft' ? 0 : r.status === 'submitted' ? 1 : 3

  return (
    <>
      <Dialog open={!!r} onClose={onClose} fullWidth maxWidth='sm' aria-labelledby='request-title'>
        {r && (
          <>
            <DialogTitle id='request-title'>{r.title}</DialogTitle>
            <DialogContent>
              <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 5 }} aria-label='สถานะคำขอ'>
                {['ร่าง', 'รออนุมัติ', finalStep].map((label, i) => (
                  <Step key={label} completed={i < activeStep}>
                    <StepLabel error={i === 2 && r.status === 'rejected'}>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              <Row label='ประเภท'>{categoryLabel(r.category)}</Row>
              <Row label='จำนวนเงิน'>{r.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Row>
              <Row label='วันที่ต้องการ'>{new Date(r.neededBy).toLocaleDateString('th-TH', { dateStyle: 'long' })}</Row>
              <Row label='ผู้ยื่น'>{r.requesterName}</Row>
              {r.detail && <Row label='รายละเอียด'>{r.detail}</Row>}
              <Typography variant='subtitle2' sx={{ mt: 4, mb: 1 }}>
                ประวัติ
              </Typography>
              <Box component='ol' sx={{ m: 0, paddingInlineStart: 5 }}>
                {r.history.map(h => (
                  <li key={h.at + h.status}>
                    <Typography variant='body2'>
                      {statusLabel[h.status]} — {h.by}, {new Date(h.at).toLocaleString('th-TH')}
                      {h.note && ` — ${h.note}`}
                    </Typography>
                  </li>
                ))}
              </Box>
            </DialogContent>
            <DialogActions sx={{ flexWrap: 'wrap', gap: 2 }}>
              <Button onClick={onClose} color='secondary' sx={{ marginInlineEnd: 'auto' }}>
                ปิด
              </Button>
              {isOwner && r.status === 'draft' && (
                <>
                  <Button variant='outlined' onClick={() => onEdit(r)} startIcon={<i className='ri-edit-line' />}>
                    แก้ไข
                  </Button>
                  <Button
                    variant='contained'
                    onClick={() => setPending('submit')}
                    startIcon={<i className='ri-send-plane-line' />}
                  >
                    ส่งคำขอ
                  </Button>
                </>
              )}
              {canApprove && r.status === 'submitted' && (
                <>
                  <Button variant='outlined' color='error' onClick={() => setPending('reject')}>
                    ไม่อนุมัติ
                  </Button>
                  <Button
                    variant='contained'
                    color='success'
                    onClick={() => setPending('approve')}
                    startIcon={<i className='ri-check-line' />}
                  >
                    อนุมัติ
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
      {pending && (
        <ConfirmDialog
          open
          title={actionText[pending].title}
          confirmLabel={actionText[pending].label}
          color={actionText[pending].color}
          busy={busy}
          confirmDisabled={pending === 'reject' && !note.trim()}
          onCancel={() => {
            setPending(null)
            setNote('')
          }}
          onConfirm={run}
          description={
            <>
              {actionText[pending].body}
              {pending === 'reject' && (
                <TextField
                  label='เหตุผล'
                  required
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                  sx={{ mt: 3 }}
                  autoFocus
                />
              )}
            </>
          }
        />
      )}
    </>
  )
}

export default RequestDetail
