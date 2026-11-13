'use client'

// "บันทึก ERM2" on a Key Risk: 5-step stepper — ปัจจัยเสี่ยง → Existing Controls → ระดับความเสี่ยง ณ เริ่มต้น →
// ความเสี่ยงที่เหลืออยู่ → รายงาน. Steps 2–4 have an overview tab plus one tab per factor. All steps share one form;
// "บันทึก" saves the whole factor list in one request. Unsaved edits are kept as a draft in localStorage.
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import IconButton from '@mui/material/IconButton'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import Step from '@mui/material/Step'
import StepButton from '@mui/material/StepButton'
import Stepper from '@mui/material/Stepper'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

// Component Imports
import { ConfirmDialog, notifyError, notifySuccess } from '@/components/kit'

// Lib Imports
import { apiBase, callApi } from '@/libs/callApi'
import { readDraft, writeDraft } from '@/libs/draft'
import {
  ADEQUACY,
  CONTROL_HEADINGS,
  RATING_KINDS,
  RESIDUAL_HEADINGS,
  factorScore,
  ratingText,
  stepsDone
} from '@/services/erm2Types'
import type { Adequacy, Erm2Record, RatingKind, RiskFactor } from '@/services/erm2Types'

import RatingPicker, { ratingPairError } from './RatingPicker'
import type { DraftRating } from './RatingPicker'
import Erm2Report, { ControlsCell, LevelCell, ResidualCell, RiskMatrix, exportErm2Word } from './Erm2Report'
import type { ReportContext } from './Erm2Report'

const STEPS = [
  'สาเหตุความเสี่ยง/ปัจจัยเสี่ยง',
  'การควบคุมที่มีอยู่/ กลยุทธ์ที่ใช้ควบคุม Existing Controls',
  'ผลการประเมินระดับความเสี่ยง จากการควบคุมที่ใช้อยู่ (ระดับความเสี่ยง ณ เริ่มต้น)',
  'ความเสี่ยงที่เหลืออยู่',
  'รายงาน ERM2'
]

const SHORT_STEPS = ['ปัจจัยเสี่ยง', 'Controls', 'ระดับเริ่มต้น', 'ที่เหลืออยู่', 'รายงาน']
const OVERVIEW_TAB = ['Existing Controls', 'ระดับความเสี่ยง ณ เริ่มต้น', 'ความเสี่ยงที่เหลืออยู่']
const REPORT_STEP = STEPS.length - 1

/** A factor while editing: id missing until saved, a rating may lack its score until both selects are set. */
type Draft = Omit<RiskFactor, 'id' | 'likelihood' | 'impact'> & {
  id?: string
  likelihood?: DraftRating
  impact?: DraftRating
}

const blank = (): Draft => ({ text: '', preventive: '', loss: '', internal: '', external: '' })

const toForm = (factors: RiskFactor[]): Draft[] => structuredClone(factors)

/** What the server would store — used to compare and to send. Incomplete ratings are dropped. */
const normalize = (form: Draft[]) =>
  form.map(f => ({
    ...(f.id ? { id: f.id } : {}),
    text: f.text.trim(),
    preventive: f.preventive.trim(),
    loss: f.loss.trim(),
    ...(f.adequacy ? { adequacy: f.adequacy } : {}),
    ...(f.likelihood?.score ? { likelihood: f.likelihood } : {}),
    ...(f.impact?.score ? { impact: f.impact } : {}),
    internal: f.internal.trim(),
    external: f.external.trim()
  }))

// Only for display: a draft row read as a saved factor (ratings without a score count as not rated).
const asFactor = (f: Draft, i: number) => ({ ...normalize([f])[0], id: f.id ?? `new-${i}` }) as RiskFactor

const textError = (f: Draft) => (f.text.trim().length < 3 ? 'กรุณาระบุปัจจัยเสี่ยงอย่างน้อย 3 ตัวอักษร' : undefined)

const ratingError = ratingPairError

const short = (s: string, n = 40) => (s.length > n ? `${s.slice(0, n)}…` : s)

/** Overview table of a step: header row on wide screens, label-per-cell cards on phones. */
const Overview = ({ headers, cols, rows }: { headers: string[]; cols: string; rows: ReactNode[][] }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: cols },
      border: 1,
      borderColor: 'divider',
      borderRadius: 1,
      overflow: 'hidden'
    }}
  >
    {headers.map((h, i) => (
      <Typography
        key={h}
        variant='subtitle2'
        sx={{
          display: { xs: 'none', md: 'block' },
          p: 2,
          fontWeight: 600,
          textAlign: 'center',
          bgcolor: 'action.hover',
          borderInlineStart: i ? 1 : 0,
          borderColor: 'divider'
        }}
      >
        {h}
      </Typography>
    ))}
    {rows.flatMap((r, ri) =>
      r.map((cell, ci) => (
        <Box
          key={`${ri}-${ci}`}
          sx={{
            p: 2,
            minInlineSize: 0,
            borderBlockStart: { xs: ri && !ci ? 3 : 0, md: 1 },
            borderInlineStart: { md: ci ? 1 : 0 },
            borderColor: 'divider'
          }}
        >
          <Typography variant='caption' color='text.secondary' sx={{ display: { md: 'none' }, fontWeight: 600 }}>
            {headers[ci]}
          </Typography>
          {typeof cell === 'string' ? (
            <Typography variant='body2' sx={{ whiteSpace: 'pre-line' }}>
              {cell}
            </Typography>
          ) : (
            cell
          )}
        </Box>
      ))
    )}
  </Box>
)

type Props = {
  risk: { id: string; text: string }
  factors: RiskFactor[]
  context: ReportContext
  onClose: () => void
  onSaved: (rec: Erm2Record) => void
}

const Erm2Editor = ({ risk, factors, context, onClose, onSaved }: Props) => {
  const fullScreen = useMediaQuery((t: Theme) => t.breakpoints.down('md'))
  const compact = useMediaQuery((t: Theme) => t.breakpoints.down('sm'))
  const draftKey = `draft:erm2:${risk.id}`
  const [step, setStep] = useState(0)
  const [tab, setTab] = useState(0)
  const [saved, setSaved] = useState<Draft[]>(() => toForm(factors))
  const [form, setForm] = useState<Draft[]>(saved)
  const [restored, setRestored] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)
  const [askClose, setAskClose] = useState(false)

  // Restore a draft left from last time (only if it differs from what is saved)
  useEffect(() => {
    const draft = readDraft<Draft[]>(draftKey)

    if (draft && JSON.stringify(normalize(draft)) !== JSON.stringify(normalize(saved))) {
      setForm(draft)
      setRestored(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opened Key Risk
  }, [draftKey])

  const dirty = useMemo(() => JSON.stringify(normalize(form)) !== JSON.stringify(normalize(saved)), [form, saved])

  useEffect(() => writeDraft(draftKey, dirty ? form : null), [draftKey, form, dirty])

  // Keep the tab valid when factors are removed
  useEffect(() => setTab(t => Math.min(t, form.length)), [form.length])

  const savedFactors = saved.map(asFactor)
  const done = stepsDone(savedFactors)
  const shown = form.map(asFactor)

  const setFactor = (i: number, patch: Partial<Draft>) =>
    setForm(form.map((f, j) => (j === i ? { ...f, ...patch } : f)))

  const save = async (): Promise<boolean> => {
    if (!dirty) return true

    const bad = form.findIndex(f => textError(f) || ratingError(f))

    if (bad >= 0) {
      setShowErrors(true)
      const isText = !!textError(form[bad])

      setStep(isText ? 0 : 2)
      if (!isText) setTab(bad + 1)
      notifyError(
        'ยังบันทึกไม่ได้',
        new Error(isText ? 'กรอกปัจจัยเสี่ยงให้ครบทุกข้อ' : `ปัจจัยที่ ${bad + 1}: ${ratingError(form[bad])}`)
      )

      return false
    }

    setBusy(true)

    try {
      const rec = await callApi<Erm2Record>(`${apiBase}/api/erm2/${risk.id}`, {
        method: 'PUT',
        body: JSON.stringify({ factors: normalize(form) })
      })

      const base = toForm(rec.factors)

      setSaved(base)
      setForm(base)
      setRestored(false)
      setShowErrors(false)
      writeDraft(draftKey, null)
      onSaved(rec)
      notifySuccess('บันทึก ERM2 แล้ว')

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

  // ---- step bodies ---------------------------------------------------------------------------------------

  const factorsStep = (
    <>
      <Typography sx={{ mb: 4 }} color='text.secondary'>
        ระบุสาเหตุความเสี่ยง/ปัจจัยเสี่ยงของ &quot;{risk.text}&quot; ได้หลายข้อ แต่ละข้อจะมีแท็บของตัวเองในขั้นที่ 2–4
      </Typography>
      <Stack spacing={3}>
        {form.map((f, i) => {
          const err = showErrors ? textError(f) : undefined

          return (
            <Box key={f.id ?? `new-${i}`} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                label={`ปัจจัยเสี่ยงที่ ${i + 1}`}
                required
                fullWidth
                multiline
                value={f.text}
                onChange={e => setFactor(i, { text: e.target.value })}
                error={!!err}
                helperText={err}
                placeholder='ระบุสาเหตุความเสี่ยง/ปัจจัยเสี่ยง'
                slotProps={{ htmlInput: { maxLength: 1000 } }}
              />
              <IconButton
                aria-label={`ลบปัจจัยเสี่ยงที่ ${i + 1}`}
                onClick={() => setForm(form.filter((_, j) => j !== i))}
                sx={{ mt: 1 }}
              >
                <i className='ri-delete-bin-line' style={{ color: 'var(--mui-palette-error-main)' }} />
              </IconButton>
            </Box>
          )
        })}
        {form.length === 0 && <Alert severity='info'>ยังไม่มีปัจจัยเสี่ยง กดปุ่มด้านล่างเพื่อเพิ่ม</Alert>}
        <Box>
          <Button
            variant='outlined'
            disabled={form.length >= 30}
            onClick={() => setForm([...form, blank()])}
            startIcon={<i className='ri-add-line' />}
          >
            เพิ่มปัจจัยเสี่ยง
          </Button>
        </Box>
      </Stack>
    </>
  )

  const ratingGroup = (i: number, kind: RatingKind) => (
    <RatingPicker
      kind={kind}
      value={form[i][kind]}
      onChange={v => setFactor(i, { [kind]: v })}
      showErrors={showErrors}
    />
  )

  const factorTab = (i: number) => {
    const f = form[i]

    const area = (key: 'preventive' | 'loss' | 'internal' | 'external', label: string) => (
      <TextField
        label={label}
        multiline
        minRows={4}
        fullWidth
        value={f[key]}
        onChange={e => setFactor(i, { [key]: e.target.value })}
        placeholder={'1) …\n2) …'}
        slotProps={{ htmlInput: { maxLength: 5000 } }}
      />
    )

    if (step === 1)
      return (
        <Stack spacing={4}>
          {area('preventive', CONTROL_HEADINGS.preventive)}
          {area('loss', CONTROL_HEADINGS.loss)}
          <FormControl>
            <FormLabel id={`adequacy-${i}`}>{CONTROL_HEADINGS.adequacy}</FormLabel>
            <RadioGroup
              row
              aria-labelledby={`adequacy-${i}`}
              value={f.adequacy ?? ''}
              onChange={e => setFactor(i, { adequacy: e.target.value as Adequacy })}
            >
              {ADEQUACY.map(a => (
                <FormControlLabel key={a.key} value={a.key} control={<Radio />} label={a.label} />
              ))}
            </RadioGroup>
          </FormControl>
        </Stack>
      )

    if (step === 2)
      return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr auto' }, gap: 5 }}>
          <Stack spacing={4}>
            {ratingGroup(i, 'likelihood')}
            {ratingGroup(i, 'impact')}
          </Stack>
          <Box sx={{ maxInlineSize: 360 }}>
            <Typography variant='subtitle2' sx={{ fontWeight: 600, textDecoration: 'underline', mb: 2 }}>
              ระดับความเสี่ยง ณ เริ่มต้น
            </Typography>
            <LevelCell f={shown[i]} />
          </Box>
        </Box>
      )

    return (
      <Stack spacing={4}>
        {area('internal', RESIDUAL_HEADINGS.internal)}
        {area('external', RESIDUAL_HEADINGS.external)}
      </Stack>
    )
  }

  const overview = () => {
    if (step === 1)
      return (
        <Overview
          headers={['ปัจจัยเสี่ยง', CONTROL_HEADINGS.preventive, CONTROL_HEADINGS.loss, CONTROL_HEADINGS.adequacy]}
          cols='1.2fr 1.5fr 1.5fr 0.6fr'
          rows={shown.map(f => [
            f.text,
            f.preventive || '-',
            f.loss || '-',
            ADEQUACY.find(a => a.key === f.adequacy)?.label ?? '-'
          ])}
        />
      )

    if (step === 2)
      return (
        <Overview
          headers={['ปัจจัยเสี่ยง', RATING_KINDS.likelihood.title, RATING_KINDS.impact.title, 'ระดับความเสี่ยง']}
          cols='1.2fr 1fr 1fr auto'
          rows={shown.map(f => [
            f.text,
            ratingText('likelihood', f.likelihood),
            ratingText('impact', f.impact),
            <RiskMatrix key='m' factor={f} small />
          ])}
        />
      )

    return (
      <Overview
        headers={['ปัจจัยเสี่ยง', RESIDUAL_HEADINGS.internal, RESIDUAL_HEADINGS.external]}
        cols='1.2fr 1fr 1fr'
        rows={shown.map(f => [f.text, f.internal || '-', f.external || '-'])}
      />
    )
  }

  const tabbedStep = () => {
    if (form.length === 0)
      return (
        <Alert
          severity='info'
          action={
            <Button color='inherit' size='small' onClick={() => setStep(0)}>
              ไปขั้นที่ 1
            </Button>
          }
        >
          ยังไม่มีปัจจัยเสี่ยง เพิ่มในขั้นที่ 1 ก่อน
        </Alert>
      )

    return (
      <>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant='scrollable'
          scrollButtons='auto'
          sx={{ mb: 4, borderBlockEnd: 1, borderColor: 'divider' }}
        >
          <Tab label={OVERVIEW_TAB[step - 1]} />
          {form.map((f, i) => (
            <Tab
              key={f.id ?? `new-${i}`}
              label={`${i + 1}. ${short(f.text || 'ยังไม่ระบุ')}`}
              iconPosition='end'
              icon={
                step === 2 && factorScore(shown[i]) !== undefined ? (
                  <Chip size='small' label={factorScore(shown[i])} sx={{ blockSize: 20 }} />
                ) : undefined
              }
              sx={{ textTransform: 'none', maxInlineSize: 320 }}
            />
          ))}
        </Tabs>
        {tab === 0 ? (
          overview()
        ) : (
          <>
            <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 4 }}>
              ปัจจัยเสี่ยงที่ {tab} : {form[tab - 1].text}
            </Typography>
            {factorTab(tab - 1)}
            {step === 1 && (
              <Box sx={{ mt: 5 }}>
                <ControlsCell f={shown[tab - 1]} />
              </Box>
            )}
            {step === 3 && (
              <Box sx={{ mt: 5 }}>
                <ResidualCell f={shown[tab - 1]} />
              </Box>
            )}
          </>
        )}
      </>
    )
  }

  const reportStep = (
    <>
      {dirty && (
        <Alert severity='warning' sx={{ mb: 4 }}>
          ยังมีการแก้ไขที่ไม่ได้บันทึก รายงานด้านล่างแสดงเฉพาะข้อมูลที่บันทึกแล้ว
        </Alert>
      )}
      <Erm2Report process={context.process} risk={risk.text} factors={savedFactors} />
    </>
  )

  return (
    <>
      <Dialog
        open
        onClose={busy ? undefined : requestClose}
        maxWidth='xl'
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby='erm2-editor-title'
      >
        <DialogTitle id='erm2-editor-title' sx={{ paddingInlineEnd: 12 }}>
          บันทึก ERM2 : {risk.text}
          <Typography variant='body2' color='text.secondary'>
            กระบวนการ {context.process} · {context.unit} · ปี {context.year}
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
          {step === 0 ? factorsStep : step === REPORT_STEP ? reportStep : tabbedStep()}
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
              <>
                <Button
                  variant='outlined'
                  onClick={() => exportErm2Word(savedFactors, { ...context, risk: risk.text })}
                  startIcon={<i className='ri-file-word-line' />}
                >
                  Export Word
                </Button>
                <Button variant='contained' onClick={requestClose} startIcon={<i className='ri-check-line' />}>
                  เสร็จสิ้น
                </Button>
              </>
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
          </Box>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={askClose}
        color='warning'
        title='ปิดโดยยังไม่บันทึก?'
        description='การแก้ไขที่ยังไม่บันทึกจะเก็บเป็นฉบับร่างในเบราว์เซอร์นี้ เปิดความเสี่ยงนี้อีกครั้งจะกู้คืนให้ หรือกด "ล้างร่าง" เพื่อทิ้ง'
        confirmLabel='ปิด เก็บเป็นร่าง'
        onConfirm={() => (setAskClose(false), onClose())}
        onCancel={() => setAskClose(false)}
      />
    </>
  )
}

export default Erm2Editor
