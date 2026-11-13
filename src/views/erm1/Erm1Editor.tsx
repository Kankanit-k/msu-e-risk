'use client'

// "บันทึก" on a process: 5-step stepper — PESTEL → McKinsey 7S → Situation Analysis → Key Risks & SOFC → report.
// All steps share one form; "บันทึก" saves every changed section in one request. Unsaved edits are kept as a
// draft in localStorage (restored on reopen, with a button to discard it).
import { useEffect, useMemo, useState } from 'react'

// MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Step from '@mui/material/Step'
import StepButton from '@mui/material/StepButton'
import Stepper from '@mui/material/Stepper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

// Component Imports
import { ConfirmDialog, notifyError, notifySuccess } from '@/components/kit'

// Lib Imports
import { apiBase, callApi } from '@/libs/callApi'
import { readDraft, writeDraft } from '@/libs/draft'
import { PESTEL, SEVEN_S, SOFC, stepsDone } from '@/services/erm1Types'
import type { Erm1Analysis, ProcessRecord } from '@/services/erm1Types'

import Erm1Report, { exportErm1Word } from './Erm1Report'
import type { ReportContext } from './Erm1Report'

const STEPS = [
  'External Environment (PESTEL)',
  'Internal Environment (McKinsey 7S model)',
  'Situation Analysis',
  'Key Risks & SOFC',
  'รายงาน ERM1'
]

// Phones: short labels so all 5 steps fit without scrolling
const SHORT_STEPS = ['PESTEL', '7S', 'Situation', 'Key Risks', 'รายงาน']

const REPORT_STEP = STEPS.length - 1

type RiskRow = { id?: string; text: string; sofc: string }
type Form = { pestel: Record<string, string>; sevenS: Record<string, string>; situation: string; keyRisks: RiskRow[] }

const toForm = (p: Erm1Analysis): Form => ({
  pestel: { ...p.pestel },
  sevenS: { ...p.sevenS },
  situation: p.situation,
  keyRisks: p.keyRisks.map(k => ({ ...k }))
})

// Saved forms always hold valid key risks (the server checked them).
const asAnalysis = (f: Form) => f as unknown as Erm1Analysis

const clean = (o: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(o)
      .map(([k, v]) => [k, v.trim()])
      .filter(([, v]) => v)
  )

// Comparable shape of each section (trimmed, empties dropped) — what the server would store.
const sections = (f: Form) => ({
  pestel: JSON.stringify(clean(f.pestel)),
  sevenS: JSON.stringify(clean(f.sevenS)),
  situation: f.situation.trim(),
  keyRisks: JSON.stringify(f.keyRisks.map(k => ({ id: k.id, text: k.text.trim(), sofc: k.sofc })))
})

const riskError = (k: RiskRow) => ({
  text: k.text.trim().length < 3 ? 'กรุณาระบุเหตุการณ์ความเสี่ยงอย่างน้อย 3 ตัวอักษร' : undefined,
  sofc: k.sofc ? undefined : 'กรุณาเลือกประเภทความเสี่ยง (SOFC)'
})

type Props = {
  process: ProcessRecord | null
  context: ReportContext | null
  initialStep?: number
  onClose: () => void
  onSaved: (rec: ProcessRecord) => void
}

const Erm1Editor = ({ process, context, initialStep = 0, onClose, onSaved }: Props) => {
  const fullScreen = useMediaQuery((t: Theme) => t.breakpoints.down('md'))
  const compact = useMediaQuery((t: Theme) => t.breakpoints.down('sm'))
  const [step, setStep] = useState(0)
  const [saved, setSaved] = useState<Form | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [restored, setRestored] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)
  const [askClose, setAskClose] = useState(false)

  const draftKey = process ? `draft:erm1:${process.id}` : ''

  // (Re)initialise when a different process is opened
  useEffect(() => {
    if (!process) return
    const base = toForm(process)
    const draft = readDraft<Form>(`draft:erm1:${process.id}`)
    const useDraft = !!draft && JSON.stringify(sections(draft)) !== JSON.stringify(sections(base))

    setSaved(base)
    setForm(useDraft ? draft : base)
    setRestored(useDraft)
    setStep(initialStep)
    setShowErrors(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when another process opens
  }, [process?.id])

  const changed = useMemo(() => {
    if (!form || !saved) return []
    const a = sections(form)
    const b = sections(saved)

    return (Object.keys(a) as (keyof typeof a)[]).filter(k => a[k] !== b[k])
  }, [form, saved])

  const dirty = changed.length > 0

  useEffect(() => {
    if (draftKey && form) writeDraft(draftKey, dirty ? form : null)
  }, [draftKey, form, dirty])

  if (!process || !form || !saved || !context) return null

  const done = stepsDone(asAnalysis(saved))
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch })

  const setRisk = (i: number, patch: Partial<RiskRow>) =>
    set({ keyRisks: form.keyRisks.map((k, j) => (j === i ? { ...k, ...patch } : k)) })

  const save = async (): Promise<boolean> => {
    if (!dirty) return true

    if (form.keyRisks.some(k => Object.values(riskError(k)).some(Boolean))) {
      setShowErrors(true)
      setStep(3)
      notifyError('ยังบันทึกไม่ได้', new Error('กรอก Key Risk และเลือกประเภทความเสี่ยง (SOFC) ให้ครบทุกข้อ'))

      return false
    }

    const body: Record<string, unknown> = {}

    for (const k of changed) body[k] = k === 'situation' ? form.situation : form[k]
    setBusy(true)

    try {
      const rec = await callApi<ProcessRecord>(`${apiBase}/api/erm1/${process.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      })

      const base = toForm(rec)

      setSaved(base)
      setForm(base)
      setRestored(false)
      setShowErrors(false)
      writeDraft(draftKey, null)
      onSaved(rec)
      notifySuccess('บันทึก ERM1 แล้ว')

      return true
    } catch (e) {
      notifyError('บันทึกไม่สำเร็จ', e)

      return false
    } finally {
      setBusy(false)
    }
  }

  const next = async () => {
    if (await save()) setStep(s => Math.min(s + 1, REPORT_STEP))
  }

  const requestClose = () => (dirty ? setAskClose(true) : onClose())

  const discardDraft = () => {
    writeDraft(draftKey, null)
    setForm(saved)
    setRestored(false)
  }

  const textFields = (list: readonly { key: string; label: string; prefix?: string }[], part: 'pestel' | 'sevenS') => (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
      {list.map(c => (
        <TextField
          key={c.key}
          label={c.label}
          multiline
          minRows={3}
          fullWidth
          value={form[part][c.key] ?? ''}
          onChange={e => set({ [part]: { ...form[part], [c.key]: e.target.value } })}
          placeholder={c.prefix ? `${c.prefix}1 : …\n${c.prefix}2 : …` : `วิเคราะห์ด้าน ${c.label}…`}
          slotProps={{ htmlInput: { maxLength: 5000 } }}
        />
      ))}
    </Box>
  )

  const stepBody = [
    <>
      <Typography sx={{ mb: 4 }} color='text.secondary'>
        วิเคราะห์ External Environment (PESTEL) — กรอกเฉพาะด้านที่เกี่ยวข้อง แต่ละด้านขึ้นบรรทัดใหม่ต่อข้อได้
      </Typography>
      {textFields(PESTEL, 'pestel')}
    </>,
    <>
      <Typography sx={{ mb: 4 }} color='text.secondary'>
        วิเคราะห์ Internal Environment (McKinsey 7S model) — กรอกเฉพาะด้านที่เกี่ยวข้อง
      </Typography>
      {textFields(SEVEN_S, 'sevenS')}
    </>,
    <>
      <Typography sx={{ mb: 4 }} color='text.secondary'>
        Situation Analysis วิเคราะห์แนวโน้มการเปลี่ยนแปลง (Mega Trend/PESTEL) & 7S
      </Typography>
      <TextField
        label='Situation Analysis'
        multiline
        minRows={8}
        fullWidth
        value={form.situation}
        onChange={e => set({ situation: e.target.value })}
        placeholder={'1) …\n2) …'}
        slotProps={{ htmlInput: { maxLength: 5000 } }}
      />
    </>,
    <>
      <Typography sx={{ mb: 4 }} color='text.secondary'>
        ระบุเหตุการณ์ความเสี่ยง (Key Risks) และประเภทความเสี่ยง (SOFC) — แต่ละข้อจะเป็น &quot;ความเสี่ยงที่ N&quot;
        ในหน้า ERM2 - 3
      </Typography>
      <Stack spacing={3}>
        {form.keyRisks.map((k, i) => {
          const err = showErrors ? riskError(k) : { text: undefined, sofc: undefined }

          return (
            <Card key={k.id ?? `new-${i}`} variant='outlined' sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                  Key Risks ({i + 1})
                </Typography>
                <IconButton
                  size='small'
                  aria-label={`ลบ Key Risks (${i + 1})`}
                  onClick={() => set({ keyRisks: form.keyRisks.filter((_, j) => j !== i) })}
                >
                  <i className='ri-delete-bin-line' style={{ color: 'var(--mui-palette-error-main)' }} />
                </IconButton>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: 3 }}>
                <TextField
                  label='ระบุเหตุการณ์ความเสี่ยง (Key Risks)'
                  required
                  multiline
                  minRows={2}
                  value={k.text}
                  onChange={e => setRisk(i, { text: e.target.value })}
                  error={!!err.text}
                  helperText={err.text}
                  slotProps={{ htmlInput: { maxLength: 1000 } }}
                />
                <TextField
                  select
                  label='ระบุประเภทความเสี่ยง (SOFC)'
                  required
                  value={k.sofc}
                  onChange={e => setRisk(i, { sofc: e.target.value })}
                  error={!!err.sofc}
                  helperText={err.sofc}
                >
                  {SOFC.map(s => (
                    <MenuItem key={s.key} value={s.key}>
                      {s.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Card>
          )
        })}
        {form.keyRisks.length === 0 && (
          <Alert severity='info'>ยังไม่มี Key Risk กดปุ่มด้านล่างเพื่อเพิ่มเหตุการณ์ความเสี่ยง</Alert>
        )}
        <Box>
          <Button
            variant='outlined'
            onClick={() => set({ keyRisks: [...form.keyRisks, { text: '', sofc: '' }] })}
            startIcon={<i className='ri-add-line' />}
          >
            เพิ่ม Key Risk
          </Button>
        </Box>
      </Stack>
    </>,
    <>
      {dirty && (
        <Alert severity='warning' sx={{ mb: 4 }}>
          ยังมีการแก้ไขที่ไม่ได้บันทึก รายงานด้านล่างแสดงเฉพาะข้อมูลที่บันทึกแล้ว
        </Alert>
      )}
      <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 3 }}>
        แบบฟอร์มการวิเคราะห์สภาพแวดล้อมองค์กร / บริบทเกี่ยวกับหน่วยงาน (Organization Context)
      </Typography>
      <Erm1Report analysis={asAnalysis(saved)} />
    </>
  ]

  return (
    <>
      <Dialog
        open
        onClose={busy ? undefined : requestClose}
        maxWidth='lg'
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby='erm1-editor-title'
      >
        <DialogTitle id='erm1-editor-title' sx={{ paddingInlineEnd: 12 }}>
          บันทึก ERM1 : {process.name}
          <Typography variant='body2' color='text.secondary'>
            เป้าประสงค์ {context.goal} · {context.unit} · ปี {context.year}
          </Typography>
          <IconButton
            aria-label='ปิด'
            onClick={requestClose}
            disabled={busy}
            sx={{ position: 'absolute', insetBlockStart: 12, insetInlineEnd: 12 }}
          >
            <i className='ri-close-line' />
          </IconButton>
        </DialogTitle>
        <Box sx={{ px: 5, py: 4, borderBlock: '1px solid var(--mui-palette-divider)' }}>
          <Stepper nonLinear alternativeLabel activeStep={step}>
            {STEPS.map((label, i) => (
              <Step key={label} completed={i < REPORT_STEP && done[i]}>
                <StepButton onClick={() => setStep(i)} sx={{ '& .MuiStepLabel-label': { mt: 1.5 } }}>
                  {compact ? SHORT_STEPS[i] : label}
                </StepButton>
              </Step>
            ))}
          </Stepper>
        </Box>
        <DialogContent sx={{ '&&': { pt: 5 } }}>
          {restored && (
            <Alert
              severity='info'
              sx={{ mb: 4 }}
              action={
                <Button color='inherit' size='small' onClick={discardDraft}>
                  ล้างร่าง
                </Button>
              }
            >
              กู้คืนการแก้ไขที่ยังไม่ได้บันทึกจากครั้งก่อน
            </Alert>
          )}
          {stepBody[step]}
        </DialogContent>
        <DialogActions
          sx={{
            '&&&': { px: 5, py: 4, borderBlockStart: '1px solid var(--mui-palette-divider)' },
            '&& .MuiButtonBase-root': { marginInlineStart: 0 },
            flexWrap: 'wrap',
            gap: 3,
            justifyContent: 'space-between'
          }}
        >
          <Button
            disabled={step === 0 || busy}
            onClick={() => setStep(s => s - 1)}
            startIcon={<i className='ri-arrow-left-s-line' />}
          >
            ย้อนกลับ
          </Button>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {step === REPORT_STEP ? (
              <Button
                variant='outlined'
                onClick={() => exportErm1Word(asAnalysis(saved), context)}
                startIcon={<i className='ri-file-word-line' />}
              >
                Export Word
              </Button>
            ) : (
              <>
                <Button
                  variant='outlined'
                  disabled={!dirty || busy}
                  onClick={save}
                  startIcon={busy ? <CircularProgress size={16} color='inherit' /> : <i className='ri-save-line' />}
                >
                  บันทึก
                </Button>
                <Button
                  variant='contained'
                  disabled={busy}
                  onClick={next}
                  endIcon={<i className='ri-arrow-right-s-line' />}
                >
                  {dirty ? 'บันทึกและถัดไป' : 'ถัดไป'}
                </Button>
              </>
            )}
            {step === REPORT_STEP && (
              <Button variant='contained' onClick={requestClose}>
                ปิด
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={askClose}
        color='warning'
        title='ปิดโดยยังไม่บันทึก?'
        description='การแก้ไขที่ยังไม่บันทึกจะเก็บเป็นฉบับร่างในเบราว์เซอร์นี้ เปิดกระบวนการนี้อีกครั้งจะกู้คืนให้ หรือกด "ล้างร่าง" เพื่อทิ้ง'
        confirmLabel='ปิด เก็บเป็นร่าง'
        onConfirm={() => (setAskClose(false), onClose())}
        onCancel={() => setAskClose(false)}
      />
    </>
  )
}

export default Erm1Editor
