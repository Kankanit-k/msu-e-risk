'use client'

// "บันทึก ERM3" on a risk factor: 7-step stepper — มาตรการ → KPI → Leading KRIs → ระดับที่คาดหวัง → ระยะเวลา →
// ผู้รับผิดชอบ → รายงาน. One form for all steps; "บันทึก" saves the whole plan. Unsaved edits stay as a draft.
import { useEffect, useMemo, useState } from 'react'

// MUI Imports
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
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
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

// Component Imports
import { ConfirmDialog, notifyError, notifySuccess } from '@/components/kit'

// Lib Imports
import { apiBase, callApi } from '@/libs/callApi'
import { readDraft, writeDraft } from '@/libs/draft'
import {
  CONTROL_KINDS,
  ERM3_STEPS,
  INDICATOR_KINDS,
  MEASURE_TYPES,
  SUPERVISOR_SUGGESTIONS,
  TARGET_DIRECTIONS,
  erm3StepsDone
} from '@/services/erm3Types'
import type { ControlKind, Erm3Record, IndicatorKind, MeasureType, TargetDirection } from '@/services/erm3Types'
import type { RiskFactor } from '@/services/erm2Types'

import { LevelCell } from '../erm2/Erm2Report'
import type { ReportContext } from '../erm2/Erm2Report'
import RatingPicker, { ratingPairError } from '../erm2/RatingPicker'
import type { DraftRating } from '../erm2/RatingPicker'
import Erm3Report, { EXPECTED_LABEL, exportErm3Word } from './Erm3Report'

const SHORT_STEPS = ['มาตรการ', 'KPI', 'KRIs', 'ที่คาดหวัง', 'ระยะเวลา', 'ผู้รับผิดชอบ', 'รายงาน']
const REPORT_STEP = ERM3_STEPS.length - 1

type MeasureDraft = { id?: string; control: ControlKind; type: MeasureType; text: string }

type IndicatorDraft = {
  id?: string
  name: string
  detail: string
  direction: TargetDirection
  target: string // text while typing; a number when sent
  unit: string
  levels: { criterion: string; note: string }[]
}

type Form = {
  measures: MeasureDraft[]
  kpis: IndicatorDraft[]
  kris: IndicatorDraft[]
  expected: { likelihood?: DraftRating; impact?: DraftRating }
  start: string
  end: string
  supervisors: string[]
  owners: string[]
}

const blankIndicator = (kind: IndicatorKind): IndicatorDraft => ({
  name: '',
  detail: '',
  direction: 'atLeast',
  target: '',
  unit: kind === 'kpis' ? 'ร้อยละ' : 'คะแนน',
  levels: Array.from({ length: 5 }, () => ({ criterion: '', note: '' }))
})

const toForm = (r?: Erm3Record): Form => ({
  measures: structuredClone(r?.measures ?? []),
  kpis: (r?.kpis ?? []).map(i => ({ ...structuredClone(i), target: i.target === undefined ? '' : String(i.target) })),
  kris: (r?.kris ?? []).map(i => ({ ...structuredClone(i), target: i.target === undefined ? '' : String(i.target) })),
  expected: structuredClone(r?.expected ?? {}),
  start: r?.start ?? '',
  end: r?.end ?? '',
  supervisors: [...(r?.supervisors ?? [])],
  owners: [...(r?.owners ?? [])]
})

const num = (s: string) => (s.trim() === '' || !Number.isFinite(Number(s)) ? undefined : Number(s))

/** What the server stores — used to compare and to send. Incomplete ratings are dropped. */
const normalize = (f: Form) => ({
  measures: f.measures.map(m => ({ ...m, text: m.text.trim() })),
  ...Object.fromEntries(
    (['kpis', 'kris'] as const).map(k => [
      k,
      f[k].map(i => ({
        ...(i.id ? { id: i.id } : {}),
        name: i.name.trim(),
        detail: i.detail.trim(),
        direction: i.direction,
        ...(num(i.target) === undefined ? {} : { target: num(i.target) }),
        unit: i.unit.trim(),
        levels: i.levels.map(l => ({ criterion: l.criterion.trim(), note: l.note.trim() }))
      }))
    ])
  ),
  expected: {
    ...(f.expected.likelihood?.score ? { likelihood: f.expected.likelihood } : {}),
    ...(f.expected.impact?.score ? { impact: f.expected.impact } : {})
  },
  ...(f.start ? { start: f.start } : {}),
  ...(f.end ? { end: f.end } : {}),
  supervisors: f.supervisors.map(s => s.trim()).filter(Boolean),
  owners: f.owners.map(s => s.trim()).filter(Boolean)
})

/** Plan shape for the report/live preview (unsaved items get a temporary id). */
const asPlan = (f: Form, base: Pick<Erm3Record, 'factorId' | 'keyRiskId' | 'year' | 'unit'>): Erm3Record => {
  const n = normalize(f) as unknown as Erm3Record
  const tmp = <T extends { id?: string }>(xs: T[], p: string) => xs.map((x, i) => ({ ...x, id: x.id ?? `${p}-${i}` }))

  return {
    ...base,
    ...n,
    measures: tmp(n.measures, 'm'),
    kpis: tmp(n.kpis, 'k'),
    kris: tmp(n.kris, 'r'),
    updatedAt: '',
    updatedBy: ''
  }
}

const measureError = (m: MeasureDraft) => (m.text.trim().length < 3 ? 'กรุณาระบุอย่างน้อย 3 ตัวอักษร' : undefined)

const indicatorError = (i: IndicatorDraft) =>
  i.name.trim().length < 3
    ? 'กรุณาระบุชื่อตัวชี้วัดอย่างน้อย 3 ตัวอักษร'
    : i.target.trim() && num(i.target) === undefined
      ? 'เป้าหมายต้องเป็นตัวเลข'
      : undefined

const periodError = (f: Form) =>
  f.start && f.end && f.start > f.end ? 'วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม' : undefined

const move = <T,>(xs: T[], i: number, d: number) => {
  const j = i + d

  if (j < 0 || j >= xs.length) return xs

  const out = [...xs]

  ;[out[i], out[j]] = [out[j], out[i]]

  return out
}

type Props = {
  factor: RiskFactor
  keyRiskId: string
  plan?: Erm3Record
  context: ReportContext
  onClose: () => void
  onSaved: (rec: Erm3Record) => void
}

const Erm3Editor = ({ factor, keyRiskId, plan, context, onClose, onSaved }: Props) => {
  const fullScreen = useMediaQuery((t: Theme) => t.breakpoints.down('md'))
  const compact = useMediaQuery((t: Theme) => t.breakpoints.down('sm'))
  const draftKey = `draft:erm3:${factor.id}`
  const base = { factorId: factor.id, keyRiskId, year: context.year, unit: context.unit }
  const [step, setStep] = useState(0)
  const [savedRec, setSavedRec] = useState<Erm3Record | undefined>(plan)
  const [saved, setSaved] = useState<Form>(() => toForm(plan))
  const [form, setForm] = useState<Form>(saved)
  const [restored, setRestored] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)
  const [askClose, setAskClose] = useState(false)

  useEffect(() => {
    const draft = readDraft<Form>(draftKey)

    if (draft && JSON.stringify(normalize(draft)) !== JSON.stringify(normalize(saved))) {
      setForm(draft)
      setRestored(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opened factor
  }, [draftKey])

  const dirty = useMemo(() => JSON.stringify(normalize(form)) !== JSON.stringify(normalize(saved)), [form, saved])

  useEffect(() => writeDraft(draftKey, dirty ? form : null), [draftKey, form, dirty])

  const done = erm3StepsDone(savedRec)
  const set = (patch: Partial<Form>) => setForm(f => ({ ...f, ...patch }))

  /** First problem as [step, message], or undefined. */
  const firstProblem = (): [number, string] | undefined => {
    if (form.measures.some(measureError)) return [0, 'กรอกมาตรการให้ครบทุกรายการ (อย่างน้อย 3 ตัวอักษร)']
    const k = form.kpis.find(indicatorError)

    if (k) return [1, `KPI: ${indicatorError(k)}`]
    const r = form.kris.find(indicatorError)

    if (r) return [2, `KRIs: ${indicatorError(r)}`]
    const rating = ratingPairError(form.expected)

    if (rating) return [3, rating]
    const period = periodError(form)

    if (period) return [4, period]
  }

  const save = async (): Promise<boolean> => {
    if (!dirty) return true

    const bad = firstProblem()

    if (bad) {
      setShowErrors(true)
      setStep(bad[0])
      notifyError('ยังบันทึกไม่ได้', new Error(bad[1]))

      return false
    }

    setBusy(true)

    try {
      const rec = await callApi<Erm3Record>(`${apiBase}/api/erm3/${factor.id}`, {
        method: 'PUT',
        body: JSON.stringify(normalize(form))
      })

      const next = toForm(rec)

      setSavedRec(rec)
      setSaved(next)
      setForm(next)
      setRestored(false)
      setShowErrors(false)
      writeDraft(draftKey, null)
      onSaved(rec)
      notifySuccess('บันทึก ERM3 แล้ว')

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

  // ---- step 1: measures --------------------------------------------------------------------------------------

  const setMeasure = (i: number, patch: Partial<MeasureDraft>) =>
    set({ measures: form.measures.map((m, j) => (j === i ? { ...m, ...patch } : m)) })

  const measuresStep = (
    <>
      <Alert severity='info' sx={{ mb: 4 }}>
        เฉพาะรายการประเภท &quot;มาตรการ/แผนงาน/โครงการ/กิจกรรม&quot; ที่ต้องรายงานผลต่อใน ERM4 ส่วน &quot;หัวข้อ&quot;
        และ &quot;หัวข้อย่อย&quot; ใช้จัดกลุ่ม
      </Alert>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 4 }}>
        {CONTROL_KINDS.map(c => {
          const rows = form.measures.map((m, i) => ({ m, i })).filter(x => x.m.control === c.key)

          return (
            <Card key={c.key} variant='outlined' sx={{ p: 3 }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 3 }}>
                {c.label}
              </Typography>
              <Stack spacing={3}>
                {rows.length === 0 && (
                  <Typography variant='body2' color='text.disabled'>
                    ยังไม่มีรายการ
                  </Typography>
                )}
                {rows.map(({ m, i }, k) => {
                  const err = showErrors ? measureError(m) : undefined

                  return (
                    <Box
                      key={m.id ?? `new-${i}`}
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'flex-start',
                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                        paddingInlineStart: m.type === 'heading' ? 0 : m.type === 'subheading' ? 2 : 4
                      }}
                    >
                      <TextField
                        select
                        size='small'
                        label='ประเภท'
                        value={m.type}
                        onChange={e => setMeasure(i, { type: e.target.value as MeasureType })}
                        sx={{ inlineSize: { xs: '100%', sm: 170 }, flexShrink: 0 }}
                      >
                        {MEASURE_TYPES.map(t => (
                          <MenuItem key={t.key} value={t.key}>
                            {t.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        size='small'
                        fullWidth
                        multiline
                        label={MEASURE_TYPES.find(t => t.key === m.type)?.label}
                        value={m.text}
                        onChange={e => setMeasure(i, { text: e.target.value })}
                        error={!!err}
                        helperText={err}
                        slotProps={{ htmlInput: { maxLength: 1000 } }}
                      />
                      <Box sx={{ display: 'flex', flexShrink: 0 }}>
                        <IconButton
                          size='small'
                          aria-label='เลื่อนขึ้น'
                          disabled={k === 0}
                          onClick={() => set({ measures: move(form.measures, i, rows[k - 1].i - i) })}
                        >
                          <i className='ri-arrow-up-s-line' />
                        </IconButton>
                        <IconButton
                          size='small'
                          aria-label='เลื่อนลง'
                          disabled={k === rows.length - 1}
                          onClick={() => set({ measures: move(form.measures, i, rows[k + 1]?.i - i) })}
                        >
                          <i className='ri-arrow-down-s-line' />
                        </IconButton>
                        <IconButton
                          size='small'
                          aria-label='ลบรายการ'
                          onClick={() => set({ measures: form.measures.filter((_, j) => j !== i) })}
                        >
                          <i className='ri-delete-bin-line' style={{ color: 'var(--mui-palette-error-main)' }} />
                        </IconButton>
                      </Box>
                    </Box>
                  )
                })}
                <Box>
                  <Button
                    size='small'
                    variant='outlined'
                    disabled={form.measures.length >= 60}
                    onClick={() => set({ measures: [...form.measures, { control: c.key, type: 'measure', text: '' }] })}
                    startIcon={<i className='ri-add-line' />}
                  >
                    เพิ่มรายการ
                  </Button>
                </Box>
              </Stack>
            </Card>
          )
        })}
      </Box>
    </>
  )

  // ---- steps 2–3: KPI / KRIs -----------------------------------------------------------------------------------

  const indicatorStep = (kind: IndicatorKind) => {
    const list = form[kind]
    const meta = INDICATOR_KINDS[kind]

    const setOne = (i: number, patch: Partial<IndicatorDraft>) =>
      set({ [kind]: list.map((x, j) => (j === i ? { ...x, ...patch } : x)) })

    return (
      <Stack spacing={4}>
        <Typography color='text.secondary'>
          {meta.title} — เพิ่มได้หลายตัว ผลของแต่ละตัวจะรายงานใน ERM4 เทียบกับเป้าหมาย
        </Typography>
        {list.length === 0 && <Alert severity='info'>ยังไม่มีตัวชี้วัด กดปุ่มด้านล่างเพื่อเพิ่ม</Alert>}
        {list.map((ind, i) => {
          const err = showErrors ? indicatorError(ind) : undefined

          return (
            <Card key={ind.id ?? `new-${i}`} variant='outlined' sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Typography variant='subtitle2' sx={{ fontWeight: 600, flex: 1 }}>
                  {meta.short} ที่ {i + 1}
                </Typography>
                <IconButton
                  aria-label={`ลบ ${meta.short} ที่ ${i + 1}`}
                  onClick={() => set({ [kind]: list.filter((_, j) => j !== i) })}
                >
                  <i className='ri-delete-bin-line' style={{ color: 'var(--mui-palette-error-main)' }} />
                </IconButton>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
                <Stack spacing={3}>
                  <TextField
                    label={meta.name}
                    required
                    fullWidth
                    value={ind.name}
                    onChange={e => setOne(i, { name: e.target.value })}
                    error={!!err && ind.name.trim().length < 3}
                    helperText={err && ind.name.trim().length < 3 ? err : undefined}
                    slotProps={{ htmlInput: { maxLength: 500 } }}
                  />
                  <TextField
                    label={`รายละเอียด${meta.name}`}
                    multiline
                    minRows={3}
                    fullWidth
                    value={ind.detail}
                    onChange={e => setOne(i, { detail: e.target.value })}
                    slotProps={{ htmlInput: { maxLength: 5000 } }}
                  />
                  <TextField
                    select
                    label='ประเภทเกณฑ์ตัวชี้วัด'
                    value={ind.direction}
                    onChange={e => setOne(i, { direction: e.target.value as TargetDirection })}
                    helperText='ใช้ตัดสิน "บรรลุ/ไม่บรรลุ" ใน ERM4'
                  >
                    {TARGET_DIRECTIONS.map(d => (
                      <MenuItem key={d.key} value={d.key}>
                        {d.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <TextField
                      label='เป้าหมาย'
                      value={ind.target}
                      onChange={e => setOne(i, { target: e.target.value })}
                      error={!!ind.target.trim() && num(ind.target) === undefined}
                      helperText={ind.target.trim() && num(ind.target) === undefined ? 'ต้องเป็นตัวเลข' : undefined}
                      slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label='หน่วยนับ'
                      value={ind.unit}
                      onChange={e => setOne(i, { unit: e.target.value })}
                      slotProps={{ htmlInput: { maxLength: 50 } }}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </Stack>
                <Box>
                  <Typography variant='body2' sx={{ fontWeight: 600, mb: 2 }}>
                    เกณฑ์{meta.name}
                  </Typography>
                  <Stack spacing={2}>
                    {ind.levels.map((l, n) => (
                      <Box key={n} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Chip size='small' label={`ระดับ ${n + 1}`} sx={{ flexShrink: 0 }} />
                        <TextField
                          size='small'
                          label='เกณฑ์ตัวชี้วัด'
                          value={l.criterion}
                          onChange={e =>
                            setOne(i, {
                              levels: ind.levels.map((x, m) => (m === n ? { ...x, criterion: e.target.value } : x))
                            })
                          }
                          slotProps={{ htmlInput: { maxLength: 500 } }}
                          sx={{ inlineSize: 120, flexShrink: 0 }}
                        />
                        <TextField
                          size='small'
                          label='คำอธิบาย'
                          fullWidth
                          value={l.note}
                          onChange={e =>
                            setOne(i, {
                              levels: ind.levels.map((x, m) => (m === n ? { ...x, note: e.target.value } : x))
                            })
                          }
                          slotProps={{ htmlInput: { maxLength: 500 } }}
                        />
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Box>
            </Card>
          )
        })}
        <Box>
          <Button
            variant='outlined'
            disabled={list.length >= 20}
            onClick={() => set({ [kind]: [...list, blankIndicator(kind)] })}
            startIcon={<i className='ri-add-line' />}
          >
            เพิ่ม {meta.short}
          </Button>
        </Box>
      </Stack>
    )
  }

  // ---- step 4: expected level ------------------------------------------------------------------------------

  const preview = asPlan(form, base)

  const expectedStep = (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr auto' }, gap: 5 }}>
      <Stack spacing={4}>
        {(['likelihood', 'impact'] as const).map(k => (
          <RatingPicker
            key={k}
            kind={k}
            value={form.expected[k]}
            onChange={v => set({ expected: { ...form.expected, [k]: v } })}
            showErrors={showErrors}
          />
        ))}
      </Stack>
      <Box sx={{ maxInlineSize: 380 }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 600, textDecoration: 'underline', mb: 2 }}>
          ระดับความเสี่ยงที่คาดหวังตามมาตรการ
        </Typography>
        <LevelCell f={preview.expected} label={EXPECTED_LABEL} />
        <Typography variant='caption' color='text.secondary' component='p' sx={{ mt: 3 }}>
          เทียบกับระดับ ณ เริ่มต้น (ERM2):{' '}
          {factor.likelihood && factor.impact
            ? `${factor.likelihood.score} x ${factor.impact.score} = ${factor.likelihood.score * factor.impact.score}`
            : 'ยังไม่ได้ประเมิน'}
        </Typography>
      </Box>
    </Box>
  )

  // ---- step 5: period ----------------------------------------------------------------------------------------

  const pErr = periodError(form)

  const periodStep = (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 260px))' }, gap: 4 }}>
      <TextField
        type='date'
        label='วันที่เริ่มโครงการ'
        value={form.start}
        onChange={e => set({ start: e.target.value })}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        type='date'
        label='วันที่สิ้นสุดโครงการ'
        value={form.end}
        onChange={e => set({ end: e.target.value })}
        error={!!pErr}
        helperText={pErr}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: form.start || undefined } }}
      />
    </Box>
  )

  // ---- step 6: people ---------------------------------------------------------------------------------------

  const people = (key: 'supervisors' | 'owners', label: string, options: string[], help: string) => (
    <Autocomplete
      multiple
      freeSolo
      autoSelect
      options={options}
      value={form[key]}
      onChange={(_, v) =>
        set({
          [key]: (v as string[])
            .map(s => s.trim())
            .filter(Boolean)
            .slice(0, 20)
        })
      }
      renderInput={params => <TextField {...params} label={label} helperText={help} />}
    />
  )

  const peopleStep = (
    <Stack spacing={5} sx={{ maxInlineSize: 720 }}>
      {people(
        'supervisors',
        'ผู้กำกับดูแลและรับผิดชอบหลัก',
        SUPERVISOR_SUGGESTIONS,
        'เลือกตำแหน่งจากรายการ หรือพิมพ์เองแล้วกด Enter เพิ่มได้หลายรายการ'
      )}
      {people('owners', 'ผู้รับผิดชอบโดยตรง (Risk Owners)', [], 'พิมพ์ชื่อ-นามสกุลแล้วกด Enter เพิ่มได้หลายคน')}
    </Stack>
  )

  const reportStep = savedRec ? (
    <>
      {dirty && (
        <Alert severity='warning' sx={{ mb: 4 }}>
          ยังมีการแก้ไขที่ไม่ได้บันทึก รายงานด้านล่างแสดงเฉพาะข้อมูลที่บันทึกแล้ว
        </Alert>
      )}
      <Erm3Report factor={factor.text} plan={savedRec} />
    </>
  ) : (
    <Alert severity='info'>ยังไม่ได้บันทึก ERM3 ของปัจจัยเสี่ยงนี้ กด &quot;บันทึก&quot; ก่อนเพื่อดูรายงาน</Alert>
  )

  const body = [
    measuresStep,
    indicatorStep('kpis'),
    indicatorStep('kris'),
    expectedStep,
    periodStep,
    peopleStep,
    reportStep
  ][step]

  return (
    <>
      <Dialog
        open
        onClose={busy ? undefined : requestClose}
        maxWidth='xl'
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby='erm3-editor-title'
      >
        <DialogTitle id='erm3-editor-title' sx={{ paddingInlineEnd: 12 }}>
          บันทึก ERM3 : {factor.text}
          <Typography variant='body2' color='text.secondary'>
            ความเสี่ยง {context.risk} · {context.unit} · ปี {context.year}
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
        <Box sx={{ px: 5, py: 4, borderBlock: '1px solid var(--mui-palette-divider)', overflowX: 'auto' }}>
          <Stepper nonLinear alternativeLabel activeStep={step} sx={{ minInlineSize: 560 }}>
            {ERM3_STEPS.map((label, i) => (
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
          {body}
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
                <Tooltip title={savedRec ? '' : 'บันทึกก่อนจึงส่งออกได้'}>
                  <span>
                    <Button
                      variant='outlined'
                      disabled={!savedRec}
                      onClick={() => savedRec && exportErm3Word(savedRec, { ...context, factor: factor.text })}
                      startIcon={<i className='ri-file-word-line' />}
                    >
                      Export Word
                    </Button>
                  </span>
                </Tooltip>
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
        description='การแก้ไขที่ยังไม่บันทึกจะเก็บเป็นฉบับร่างในเบราว์เซอร์นี้ เปิดปัจจัยเสี่ยงนี้อีกครั้งจะกู้คืนให้ หรือกด "ล้างร่าง" เพื่อทิ้ง'
        confirmLabel='ปิด เก็บเป็นร่าง'
        onConfirm={() => (setAskClose(false), onClose())}
        onCancel={() => setAskClose(false)}
      />
    </>
  )
}

export default Erm3Editor
