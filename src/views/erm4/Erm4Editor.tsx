'use client'

// "บันทึก ERM4" on a risk factor: pick the round (6 / 9 / 12 เดือน), then 5 tabs — measure results, KPI, KRIs,
// level at the round, attachments — reporting on the factor's ERM3 plan. "บันทึก" saves the whole round.
// Unsaved edits are kept as a draft per round in localStorage.
import { useEffect, useMemo, useState } from 'react'

// MUI Imports
import Alert from '@mui/material/Alert'
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
import InputAdornment from '@mui/material/InputAdornment'
import Link from '@mui/material/Link'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

// Component Imports
import { ConfirmDialog, notifyError, notifySuccess } from '@/components/kit'
import FileUpload, { fileUrl } from '@/components/upload/FileUpload'

// Lib Imports
import { apiBase, callApi } from '@/libs/callApi'
import { readDraft, writeDraft } from '@/libs/draft'
import type { Rating, RiskFactor } from '@/services/erm2Types'
import { INDICATOR_KINDS } from '@/services/erm3Types'
import type { Erm3Record, IndicatorKind } from '@/services/erm3Types'
import {
  ERM4_TABS,
  MAX_FILES_MB,
  ROUNDS,
  achieved,
  erm4TabsDone,
  measureStatus,
  roundLabel
} from '@/services/erm4Types'
import type { Attachment, Erm4Record, Round } from '@/services/erm4Types'

import { LevelCell, RiskMatrix } from '../erm2/Erm2Report'
import type { ReportContext } from '../erm2/Erm2Report'
import RatingPicker, { ratingPairError } from '../erm2/RatingPicker'
import type { DraftRating } from '../erm2/RatingPicker'
import { EXPECTED_LABEL, IndicatorCard, MeasureOutline } from '../erm3/Erm3Report'
import { exportErm4Word } from './Erm4Export'

type Form = {
  measures: Record<string, { result: string; percent: string }>
  kpis: Record<string, { detail: string; value: string }>
  kris: Record<string, { detail: string; value: string }>
  level: { likelihood?: DraftRating; impact?: DraftRating }
  links: { label: string; url: string }[]
  files: Attachment[]
}

/** A rating with both selects set, or undefined. */
const complete = (r?: DraftRating): Rating | undefined =>
  r?.score ? { criterion: r.criterion, score: r.score } : undefined

const str = (n?: number) => (n === undefined ? '' : String(n))
const num = (s: string) => (s.trim() === '' || !Number.isFinite(Number(s)) ? undefined : Number(s))

const mapValues = <A, B>(o: Record<string, A>, f: (a: A) => B) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)]))

const toForm = (r?: Erm4Record): Form => ({
  measures: mapValues(r?.measures ?? {}, m => ({ result: m.result, percent: str(m.percent) })),
  kpis: mapValues(r?.kpis ?? {}, k => ({ detail: k.detail, value: str(k.value) })),
  kris: mapValues(r?.kris ?? {}, k => ({ detail: k.detail, value: str(k.value) })),
  level: structuredClone(r?.level ?? {}),
  links: structuredClone(r?.links ?? []),
  files: structuredClone(r?.files ?? [])
})

const isEmpty = (o: Record<string, string>) => Object.values(o).every(v => !v.trim())

/** What the server stores (minus file metadata) — used to compare and to send. Empty rows are dropped. */
const normalize = (f: Form) => {
  const results = (o: Form['kpis']) =>
    Object.fromEntries(
      Object.entries(o)
        .filter(([, v]) => !isEmpty(v))
        .map(([id, v]) => [
          id,
          { detail: v.detail.trim(), ...(num(v.value) === undefined ? {} : { value: num(v.value) }) }
        ])
    )

  return {
    measures: Object.fromEntries(
      Object.entries(f.measures)
        .filter(([, v]) => !isEmpty(v))
        .map(([id, v]) => [
          id,
          { result: v.result.trim(), ...(num(v.percent) === undefined ? {} : { percent: num(v.percent) }) }
        ])
    ),
    kpis: results(f.kpis),
    kris: results(f.kris),
    level: {
      ...(complete(f.level.likelihood) ? { likelihood: complete(f.level.likelihood) } : {}),
      ...(complete(f.level.impact) ? { impact: complete(f.level.impact) } : {})
    },
    links: f.links.map(l => ({ label: l.label.trim(), url: l.url.trim() })).filter(l => l.url || l.label),
    files: f.files.map(x => x.id)
  }
}

const percentError = (s: string) => {
  if (!s.trim()) return undefined
  const n = num(s)

  return n === undefined || n < 0 || n > 100 ? 'ต้องเป็นตัวเลข 0–100' : undefined
}

const valueError = (s: string) => (s.trim() && num(s) === undefined ? 'ต้องเป็นตัวเลข' : undefined)

const urlError = (u: string) => {
  if (!u.trim()) return 'กรุณาระบุลิงก์'

  if (!/^https?:\/\//i.test(u.trim())) return 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://'

  try {
    new URL(u.trim())

    return undefined
  } catch {
    return 'ลิงก์ไม่ถูกต้อง'
  }
}

const sizeText = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`)

type Props = {
  factor: RiskFactor
  plan: Erm3Record
  records: Erm4Record[]
  context: ReportContext
  onClose: () => void
  onSaved: (rec: Erm4Record) => void
}

const Erm4Editor = ({ factor, plan, records, context, onClose, onSaved }: Props) => {
  const fullScreen = useMediaQuery((t: Theme) => t.breakpoints.down('md'))
  const [saved, setSaved] = useState<Erm4Record[]>(records)
  const recordOf = (r: Round) => saved.find(x => x.round === r)

  // Open the first round not reported yet (or the last one)
  const [round, setRound] = useState<Round>(() => ROUNDS.find(r => !records.some(x => x.round === r)) ?? 12)
  const [tab, setTab] = useState(0)
  const [base, setBase] = useState<Form>(() => toForm(recordOf(round)))
  const [form, setForm] = useState<Form>(base)
  const [restored, setRestored] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)
  const [askClose, setAskClose] = useState(false)
  const [pendingRound, setPendingRound] = useState<Round | null>(null)

  const draftKey = `draft:erm4:${factor.id}:${round}`
  const dirty = useMemo(() => JSON.stringify(normalize(form)) !== JSON.stringify(normalize(base)), [form, base])

  // Load the round (saved values, or a draft left from last time)
  useEffect(() => {
    const b = toForm(saved.find(x => x.round === round))
    const draft = readDraft<Form>(draftKey)
    const useDraft = !!draft && JSON.stringify(normalize(draft)) !== JSON.stringify(normalize(b))

    setBase(b)
    setForm(useDraft ? draft! : b)
    setRestored(useDraft)
    setShowErrors(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the round (or factor) changes
  }, [draftKey])

  useEffect(() => writeDraft(draftKey, dirty ? form : null), [draftKey, form, dirty])

  const measures = plan.measures.filter(m => m.type === 'measure')
  const tabsDone = erm4TabsDone(plan, recordOf(round))
  const set = (patch: Partial<Form>) => setForm(f => ({ ...f, ...patch }))

  const firstProblem = (): [number, string] | undefined => {
    if (Object.values(form.measures).some(m => percentError(m.percent))) return [0, 'ร้อยละต้องเป็นตัวเลข 0–100']
    if (Object.values(form.kpis).some(k => valueError(k.value))) return [1, 'ผลการดำเนินงาน KPI ต้องเป็นตัวเลข']
    if (Object.values(form.kris).some(k => valueError(k.value))) return [2, 'ผลการดำเนินงาน KRIs ต้องเป็นตัวเลข']
    const rating = ratingPairError(form.level)

    if (rating) return [3, rating]
    if (form.links.some(l => (l.url.trim() || l.label.trim()) && urlError(l.url))) return [4, 'ตรวจสอบลิงก์ที่เพิ่ม']
  }

  const save = async () => {
    if (!dirty) return
    const bad = firstProblem()

    if (bad) {
      setShowErrors(true)
      setTab(bad[0])
      notifyError('ยังบันทึกไม่ได้', new Error(bad[1]))

      return
    }

    setBusy(true)

    try {
      const rec = await callApi<Erm4Record>(`${apiBase}/api/erm4/${factor.id}/${round}`, {
        method: 'PUT',
        body: JSON.stringify(normalize(form))
      })

      const b = toForm(rec)

      setSaved(s => [...s.filter(x => x.round !== round), rec])
      setBase(b)
      setForm(b)
      setRestored(false)
      setShowErrors(false)
      writeDraft(draftKey, null)
      onSaved(rec)
      notifySuccess(`บันทึก ERM4 ${roundLabel(round)} แล้ว`)
    } catch (e) {
      notifyError('บันทึกไม่สำเร็จ', e)
    } finally {
      setBusy(false)
    }
  }

  const changeRound = (r: Round) => (dirty ? setPendingRound(r) : setRound(r))
  const requestClose = () => (dirty ? setAskClose(true) : onClose())

  const discardDraft = () => {
    writeDraft(draftKey, null)
    setForm(base)
    setRestored(false)
  }

  // ---- tab 1: measures ---------------------------------------------------------------------------------------

  const measureInputs = (id: string) => {
    const v = form.measures[id] ?? { result: '', percent: '' }
    const setV = (patch: Partial<typeof v>) => set({ measures: { ...form.measures, [id]: { ...v, ...patch } } })
    const status = measureStatus({ result: v.result, percent: num(v.percent) })
    const err = percentError(v.percent)

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 180px' },
          gap: 3,
          mt: 2,
          mb: 3,
          p: 3,
          borderRadius: 1,
          bgcolor: 'action.hover'
        }}
      >
        <TextField
          label='ผลการดำเนินงาน'
          placeholder='ระบุ ผลการดำเนินงาน'
          multiline
          minRows={2}
          fullWidth
          value={v.result}
          onChange={e => setV({ result: e.target.value })}
          slotProps={{ htmlInput: { maxLength: 5000 } }}
        />
        <Stack spacing={2}>
          <TextField
            label='ร้อยละความสำเร็จ'
            value={v.percent}
            onChange={e => setV({ percent: e.target.value })}
            error={!!err}
            helperText={err}
            slotProps={{
              htmlInput: { inputMode: 'decimal' },
              input: { endAdornment: <InputAdornment position='end'>%</InputAdornment> }
            }}
          />
          {!err && <Chip size='small' variant='tonal' color={status.color} label={status.label} />}
        </Stack>
      </Box>
    )
  }

  const measuresTab = measures.length ? (
    <MeasureOutline measures={plan.measures} extra={m => measureInputs(m.id)} />
  ) : (
    <Alert severity='info'>
      แผน ERM3 ของปัจจัยเสี่ยงนี้ยังไม่มีรายการประเภท &quot;มาตรการ/แผนงาน/โครงการ/กิจกรรม&quot; จึงไม่มีผลที่ต้องรายงาน
    </Alert>
  )

  // ---- tabs 2–3: KPI / KRIs ---------------------------------------------------------------------------------

  const indicatorTab = (kind: IndicatorKind) => {
    const list = plan[kind]
    const meta = INDICATOR_KINDS[kind]

    if (!list.length) return <Alert severity='info'>แผน ERM3 ของปัจจัยเสี่ยงนี้ยังไม่มี {meta.short}</Alert>

    return (
      <Stack spacing={4}>
        {list.map(ind => {
          const v = form[kind][ind.id] ?? { detail: '', value: '' }
          const setV = (patch: Partial<typeof v>) => set({ [kind]: { ...form[kind], [ind.id]: { ...v, ...patch } } })
          const ok = achieved(ind, num(v.value))
          const err = valueError(v.value)

          return (
            <Card key={ind.id} variant='outlined' sx={{ p: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.2fr' }, gap: 4 }}>
                <IndicatorCard i={ind} kind={kind} compact />
                <Stack spacing={3}>
                  <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                    ผลการดำเนินงานตาม{meta.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <TextField
                      label='ผลการดำเนินงาน'
                      value={v.value}
                      onChange={e => setV({ value: e.target.value })}
                      error={!!err}
                      helperText={err ?? ind.unit}
                      slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                      sx={{ inlineSize: 180 }}
                    />
                    <Box sx={{ pt: 2 }}>
                      <Typography variant='body2' component='span'>
                        การบรรลุเป้าหมาย :{' '}
                      </Typography>
                      {num(v.value) === undefined || ind.target === undefined ? (
                        <Chip size='small' variant='outlined' label='ยังประเมินไม่ได้' />
                      ) : (
                        <Chip
                          size='small'
                          variant='tonal'
                          color={ok ? 'success' : 'error'}
                          label={ok ? 'บรรลุ' : 'ไม่บรรลุ'}
                        />
                      )}
                      {ind.target === undefined && (
                        <Typography variant='caption' color='text.secondary' component='p'>
                          ERM3 ยังไม่ได้กำหนดเป้าหมาย จึงประเมินการบรรลุไม่ได้
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <TextField
                    label='รายละเอียดการดำเนินงานตามตัวชี้วัด'
                    placeholder='ระบุ รายละเอียดการดำเนินงานตามตัวชี้วัด'
                    multiline
                    minRows={3}
                    fullWidth
                    value={v.detail}
                    onChange={e => setV({ detail: e.target.value })}
                    slotProps={{ htmlInput: { maxLength: 5000 } }}
                  />
                </Stack>
              </Box>
            </Card>
          )
        })}
      </Stack>
    )
  }

  // ---- tab 4: level at the round ---------------------------------------------------------------------------

  const levelTab = (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr auto' }, gap: 5 }}>
      <Stack spacing={4}>
        {(['likelihood', 'impact'] as const).map(k => (
          <RatingPicker
            key={k}
            kind={k}
            value={form.level[k]}
            onChange={v => set({ level: { ...form.level, [k]: v } })}
            showErrors={showErrors}
          />
        ))}
      </Stack>
      <Box sx={{ maxInlineSize: 400 }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 600, textDecoration: 'underline', mb: 2 }}>
          ระดับความเสี่ยง ณ {roundLabel(round)}
        </Typography>
        <LevelCell
          f={{ likelihood: complete(form.level.likelihood), impact: complete(form.level.impact) }}
          label={`ระดับความเสี่ยง ณ ${roundLabel(round)}`}
        />
        <Box sx={{ display: 'flex', gap: 4, mt: 4, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {[
            { label: 'ณ เริ่มต้น (ERM2)', f: factor },
            { label: `${EXPECTED_LABEL} (ERM3)`, f: plan.expected }
          ].map(x => (
            <Box key={x.label}>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                {x.label}
              </Typography>
              <RiskMatrix factor={x.f} small />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )

  // ---- tab 5: attachments -----------------------------------------------------------------------------------

  const savedIds = new Set(base.files.map(f => f.id))
  const addedBytes = form.files.filter(f => !savedIds.has(f.id)).reduce((n, f) => n + f.size, 0)
  const overLimit = addedBytes > MAX_FILES_MB * 1024 * 1024

  const attachmentsTab = (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 5 }}>
      <Stack spacing={3}>
        <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
          ลิงก์ไฟล์ (เพิ่มได้หลายลิงก์)
        </Typography>
        {form.links.map((l, i) => {
          // A started row shows its URL problem once a URL is typed, or after a failed save
          const err = (showErrors && l.label.trim()) || l.url.trim() ? urlError(l.url) : undefined

          const setL = (patch: Partial<typeof l>) =>
            set({ links: form.links.map((x, j) => (j === i ? { ...x, ...patch } : x)) })

          return (
            <Box
              key={i}
              sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}
            >
              <TextField
                size='small'
                label='ชื่อเอกสาร'
                value={l.label}
                onChange={e => setL({ label: e.target.value })}
                slotProps={{ htmlInput: { maxLength: 200 } }}
                sx={{ inlineSize: { xs: '100%', sm: 200 }, flexShrink: 0 }}
              />
              <TextField
                size='small'
                label='ลิงก์ (https://…)'
                fullWidth
                value={l.url}
                onChange={e => setL({ url: e.target.value })}
                error={!!err}
                helperText={err}
              />
              <IconButton aria-label='ลบลิงก์' onClick={() => set({ links: form.links.filter((_, j) => j !== i) })}>
                <i className='ri-delete-bin-line' style={{ color: 'var(--mui-palette-error-main)' }} />
              </IconButton>
            </Box>
          )
        })}
        <Box>
          <Button
            size='small'
            variant='outlined'
            disabled={form.links.length >= 20}
            onClick={() => set({ links: [...form.links, { label: '', url: '' }] })}
            startIcon={<i className='ri-link' />}
          >
            เพิ่มลิงก์
          </Button>
        </Box>
      </Stack>
      <Stack spacing={3}>
        <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
          ไฟล์แนบ
        </Typography>
        <FileUpload label='เลือกไฟล์' onUploaded={f => set({ files: [...form.files, f] })} />
        <Typography variant='caption' color='text.secondary'>
          อัปโหลดได้ทีละไฟล์ หลายครั้ง ไฟล์ที่เพิ่มรวมกันไม่เกิน {MAX_FILES_MB} MB ต่อการบันทึก 1 ครั้ง แล้วกด
          &quot;บันทึก&quot; เพื่อแนบเข้ากับรอบนี้
        </Typography>
        {overLimit && (
          <Alert severity='error'>
            ไฟล์ที่เพิ่มรวม {sizeText(addedBytes)} เกิน {MAX_FILES_MB} MB ลบบางไฟล์ แล้วบันทึกที่เหลือในครั้งถัดไป
          </Alert>
        )}
        {form.files.length === 0 ? (
          <Typography variant='body2' color='text.disabled'>
            ยังไม่มีไฟล์แนบ
          </Typography>
        ) : (
          <Stack spacing={1}>
            {form.files.map(f => (
              <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <i className='ri-file-line' />
                <Link href={fileUrl(f.id)} sx={{ flex: 1, minInlineSize: 0, overflowWrap: 'anywhere' }}>
                  {f.name}
                </Link>
                <Typography variant='caption' color='text.secondary'>
                  {sizeText(f.size)}
                </Typography>
                {!savedIds.has(f.id) && <Chip size='small' color='warning' variant='tonal' label='ยังไม่บันทึก' />}
                <IconButton
                  size='small'
                  aria-label={`เอา ${f.name} ออก`}
                  onClick={() => set({ files: form.files.filter(x => x.id !== f.id) })}
                >
                  <i className='ri-close-line' />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  )

  const tabLabels = ERM4_TABS.map((t, i) => (i === 3 ? `${t} ${round} เดือน` : t))
  const body = [measuresTab, indicatorTab('kpis'), indicatorTab('kris'), levelTab, attachmentsTab][tab]

  return (
    <>
      <Dialog
        open
        onClose={busy ? undefined : requestClose}
        maxWidth='xl'
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby='erm4-editor-title'
      >
        <DialogTitle id='erm4-editor-title' sx={{ paddingInlineEnd: 12 }}>
          บันทึก ERM4 : {factor.text}
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
        <Box sx={{ px: 5, pt: 4, borderBlockStart: '1px solid var(--mui-palette-divider)' }}>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap', mb: 3 }}>
            <TextField
              select
              size='small'
              label='รอบการรายงาน'
              value={round}
              onChange={e => changeRound(Number(e.target.value) as Round)}
              disabled={busy}
              sx={{ inlineSize: 200 }}
            >
              {ROUNDS.map(r => (
                <MenuItem key={r} value={r}>
                  {r} เดือน {recordOf(r) ? '✓' : ''}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant='outlined'
              title={dirty ? 'ส่งออกเฉพาะข้อมูลที่บันทึกแล้ว' : undefined}
              onClick={() => exportErm4Word(plan, recordOf(round), round, { ...context, factor: factor.text })}
              startIcon={<i className='ri-file-word-line' />}
            >
              Export Word
            </Button>
            {recordOf(round) && (
              <Typography variant='caption' color='text.secondary'>
                บันทึกล่าสุด{' '}
                {new Date(recordOf(round)!.updatedAt).toLocaleString('th-TH', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </Typography>
            )}
          </Box>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant='scrollable'
            scrollButtons='auto'
            sx={{ borderBlockEnd: 1, borderColor: 'divider' }}
          >
            {tabLabels.map((t, i) => (
              <Tab
                key={i}
                label={t}
                iconPosition='start'
                icon={
                  i === 4 ? (
                    <i className='ri-upload-cloud-2-line' />
                  ) : tabsDone[i] && recordOf(round) ? (
                    <i className='ri-checkbox-circle-fill' style={{ color: 'var(--mui-palette-success-main)' }} />
                  ) : undefined
                }
                sx={{ textTransform: 'none', maxInlineSize: 300, minBlockSize: 56 }}
              />
            ))}
          </Tabs>
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
              กู้คืนการแก้ไข {roundLabel(round)} ที่ยังไม่ได้บันทึกจากครั้งก่อน
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
          <Typography variant='body2' color={dirty ? 'warning.main' : 'text.secondary'}>
            {dirty
              ? `มีการแก้ไข ${roundLabel(round)} ที่ยังไม่ได้บันทึก`
              : `${roundLabel(round)} · บันทึกทุกแท็บพร้อมกัน`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Button onClick={requestClose} disabled={busy}>
              ปิด
            </Button>
            <Button
              variant='contained'
              disabled={!dirty || busy || overLimit}
              onClick={save}
              startIcon={busy ? <CircularProgress size={16} color='inherit' /> : <i className='ri-save-line' />}
            >
              บันทึก {roundLabel(round)}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={askClose}
        color='warning'
        title='ปิดโดยยังไม่บันทึก?'
        description='การแก้ไขที่ยังไม่บันทึกจะเก็บเป็นฉบับร่างในเบราว์เซอร์นี้ เปิดรอบนี้อีกครั้งจะกู้คืนให้ หรือกด "ล้างร่าง" เพื่อทิ้ง'
        confirmLabel='ปิด เก็บเป็นร่าง'
        onConfirm={() => (setAskClose(false), onClose())}
        onCancel={() => setAskClose(false)}
      />

      <ConfirmDialog
        open={pendingRound !== null}
        color='warning'
        title='เปลี่ยนรอบโดยยังไม่บันทึก?'
        description={`การแก้ไข ${roundLabel(round)} จะเก็บเป็นฉบับร่างในเบราว์เซอร์นี้ กลับมาที่รอบนี้อีกครั้งจะกู้คืนให้`}
        confirmLabel='เปลี่ยนรอบ'
        onConfirm={() => {
          if (pendingRound) setRound(pendingRound)
          setPendingRound(null)
        }}
        onCancel={() => setPendingRound(null)}
      />
    </>
  )
}

export default Erm4Editor
