'use client'

// Confirm step for destructive or irreversible actions (delete, reject, discard changes).
import type { ReactNode } from 'react'

// MUI Imports
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

type Props = {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string

  /** 'error' for destructive actions (default), 'primary' for neutral confirmations. */
  color?: 'error' | 'primary' | 'warning'
  busy?: boolean

  /** Block confirming (e.g. until a required reason is typed) without blocking cancel. */
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  color = 'error',
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel
}: Props) => (
  <Dialog open={open} onClose={busy ? undefined : onCancel} maxWidth='xs' fullWidth aria-labelledby='confirm-title'>
    <DialogTitle id='confirm-title'>{title}</DialogTitle>
    {description && (
      <DialogContent>
        <DialogContentText component='div'>{description}</DialogContentText>
      </DialogContent>
    )}
    <DialogActions>
      <Button onClick={onCancel} disabled={busy} color='secondary'>
        {cancelLabel}
      </Button>
      {/* Not autoFocus: Enter must not confirm a destructive action by accident. */}
      <Button onClick={onConfirm} disabled={busy || confirmDisabled} variant='contained' color={color}>
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
)

export default ConfirmDialog
