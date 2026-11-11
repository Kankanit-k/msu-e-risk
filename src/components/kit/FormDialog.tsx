'use client'

// Create/edit form in a modal. Configured by a field list:
//   - inline validation on blur and on change (after the field was touched)
//   - unsaved changes → confirm before closing (Esc, backdrop or ยกเลิก)
//   - draft kept in localStorage under `draftKey`, restored on reopen, with a "ล้างร่าง" button
//   - Enter submits (native <form>), Esc closes
import { useEffect, useRef, useState } from 'react'
import type { FormEvent, MutableRefObject } from 'react'

// MUI Imports
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

// Component Imports
import ConfirmDialog from './ConfirmDialog'

export type FormValues = Record<string, string>

export type FormField = {
  name: string
  label: string
  type?: 'text' | 'textarea' | 'number' | 'date' | 'select'
  options?: { value: string; label: string }[]
  required?: boolean
  helperText?: string

  /** Return an error message, or nothing when the value is valid. */
  validate?: (value: string, values: FormValues) => string | undefined
}

type Props = {
  open: boolean
  title: string
  fields: FormField[]
  initialValues: FormValues

  /** localStorage key for the draft, e.g. 'draft:requests:new'. Omit to disable drafts. */
  draftKey?: string
  submitLabel?: string
  onClose: () => void

  /** Throw to keep the dialog open (the caller shows the error toast). */
  onSubmit: (values: FormValues) => Promise<void>
}

const readDraft = (key?: string): FormValues | null => {
  if (!key) return null

  try {
    const raw = localStorage.getItem(key)

    return raw ? (JSON.parse(raw) as FormValues) : null
  } catch {
    return null // storage blocked (private mode) or corrupt → just no draft
  }
}

const writeDraft = (key: string | undefined, values: FormValues | null) => {
  if (!key) return

  try {
    if (values) localStorage.setItem(key, JSON.stringify(values))
    else localStorage.removeItem(key)
  } catch {
    // storage full or blocked — the form still works without a draft
  }
}

const errorFor = (f: FormField, values: FormValues) => {
  const v = values[f.name] ?? ''

  if (f.required && !v.trim()) return `กรุณากรอก${f.label}`

  return v ? f.validate?.(v, values) : undefined
}

// The inner form mounts fresh each time the dialog opens, so its state starts from the draft.
type BodyProps = Omit<Props, 'open'> & { closeRef: MutableRefObject<(() => void) | null> }

const FormBody = ({ title, fields, initialValues, draftKey, submitLabel = 'บันทึก', onClose, onSubmit, closeRef }: BodyProps) => {
  const [restored] = useState(() => {
    const draft = readDraft(draftKey)

    return draft && JSON.stringify(draft) !== JSON.stringify(initialValues) ? draft : null
  })

  const [values, setValues] = useState<FormValues>(() => ({ ...initialValues, ...restored }))
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [showRestored, setShowRestored] = useState(!!restored)

  const dirty = fields.some(f => (values[f.name] ?? '') !== (initialValues[f.name] ?? ''))

  const change = (name: string, value: string) => {
    const next = { ...values, [name]: value }

    setValues(next)
    writeDraft(draftKey, next)
  }

  const clearDraft = () => {
    writeDraft(draftKey, null)
    setValues(initialValues)
    setTouched({})
    setShowRestored(false)
  }

  const requestClose = () => (dirty ? setConfirmDiscard(true) : onClose())

  // Esc / backdrop (handled by the outer Dialog) go through the same unsaved-changes check.
  useEffect(() => {
    closeRef.current = requestClose
  })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(Object.fromEntries(fields.map(f => [f.name, true])))
    if (fields.some(f => errorFor(f, values)) || busy) return

    setBusy(true)

    try {
      await onSubmit(values)
      writeDraft(draftKey, null)
      onClose()
    } catch {
      // onSubmit reported the error; keep the form (and the draft) as is
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <form onSubmit={submit} noValidate>
        <DialogTitle id='form-dialog-title'>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={4} sx={{ pt: 1 }}>
            {showRestored && (
              <Alert
                severity='info'
                action={
                  <Button color='inherit' size='small' onClick={clearDraft}>
                    ล้างร่าง
                  </Button>
                }
              >
                กู้คืนข้อมูลที่ยังไม่ได้บันทึกจากครั้งก่อน
              </Alert>
            )}
            {fields.map(f => {
              const err = touched[f.name] ? errorFor(f, values) : undefined

              return (
                <TextField
                  key={f.name}
                  name={f.name}
                  label={f.label}
                  required={f.required}
                  value={values[f.name] ?? ''}
                  onChange={e => change(f.name, e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, [f.name]: true }))}
                  error={!!err}
                  helperText={err ?? f.helperText}
                  select={f.type === 'select'}
                  multiline={f.type === 'textarea'}
                  minRows={f.type === 'textarea' ? 3 : undefined}
                  type={f.type === 'number' || f.type === 'date' ? f.type : 'text'}
                  slotProps={f.type === 'date' ? { inputLabel: { shrink: true } } : undefined}
                  fullWidth
                >
                  {f.options?.map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
              )
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          {draftKey && dirty && (
            <Button onClick={clearDraft} color='secondary' sx={{ marginInlineEnd: 'auto' }}>
              ล้างฟอร์ม
            </Button>
          )}
          <Button onClick={requestClose} color='secondary' disabled={busy}>
            ยกเลิก
          </Button>
          <Button type='submit' variant='contained' disabled={busy}>
            {busy ? 'กำลังบันทึก…' : submitLabel}
          </Button>
        </DialogActions>
      </form>
      <ConfirmDialog
        open={confirmDiscard}
        title='ทิ้งการเปลี่ยนแปลง?'
        description='ข้อมูลที่กรอกไว้จะยังเก็บเป็นร่างในเครื่องนี้ เปิดฟอร์มอีกครั้งเพื่อกรอกต่อได้'
        confirmLabel='ปิดฟอร์ม'
        color='warning'
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false)
          onClose()
        }}
      />
    </>
  )
}

const FormDialog = (props: Props) => {
  const fullScreen = useMediaQuery((t: Theme) => t.breakpoints.down('sm'))
  const closeRef = useRef<(() => void) | null>(null)

  return (
    <Dialog
      open={props.open}
      onClose={() => closeRef.current?.()}
      fullWidth
      maxWidth='sm'
      fullScreen={fullScreen}
      aria-labelledby='form-dialog-title'
    >
      {props.open && <FormBody {...props} closeRef={closeRef} />}
    </Dialog>
  )
}

export default FormDialog
