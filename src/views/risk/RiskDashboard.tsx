'use client'

// Risk overview dashboard (ported from the html/index.html mockup). Data is mock — see ./mockData.ts.
// Every number is clickable and opens the records behind it in a dialog.
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

// Component Imports
import { DataTable, EmptyState, FilterBar, notifySuccess } from '@/components/kit'
import type { Column, FilterField, FilterValues } from '@/components/kit'

// Data Imports
import {
  CATS,
  KRI_COLOR,
  LEVELS,
  ROUNDS,
  STATUS,
  UNITS,
  YEARS,
  buildView,
  delayed,
  kriStatus,
  kriValue,
  level,
  progress,
  residual,
  scoreAt,
  trend
} from './mockData'
import type { DashView, Kri, Risk, StatusKey, UnitRow } from './mockData'

type Drill =
  | { kind: 'risks'; title: string; rows: Risk[] }
  | { kind: 'units'; title: string; rows: UnitRow[] }
  | { kind: 'kris'; title: string; rows: Kri[] }
  | { kind: 'risk'; title: string; risk: Risk }
  | { kind: 'kri'; title: string; kri: Kri }

const FILTER_KEY = 'erisk-dash-filter'
const DEFAULT_FILTER: FilterValues = { year: '2569', round: '2', unit: '' }

const filterFields: FilterField[] = [
  {
    key: 'year',
    label: 'ปีงบประมาณ',
    type: 'select',
    required: true,
    options: YEARS.map(y => ({ value: String(y), label: `ปีงบ ${y}` }))
  },
  {
    key: 'round',
    label: 'รอบรายงาน',
    type: 'select',
    required: true,
    options: ROUNDS.map((r, i) => ({ value: String(i), label: `รอบ${r.label}` }))
  },
  { key: 'unit', label: 'หน่วยงาน', type: 'select', options: UNITS.map((u, i) => ({ value: String(i), label: u })) }
]

// ── Small building blocks ─────────────────────────────────────────────

const ScoreChip = ({ s }: { s: number }) => (
  <Box
    component='span'
    title={level(s).name}
    sx={{
      display: 'inline-grid',
      placeItems: 'center',
      minInlineSize: 28,
      px: 1.5,
      py: 0.25,
      borderRadius: 2,
      color: '#fff',
      fontWeight: 700,
      fontSize: '0.78rem',
      bgcolor: level(s).color
    }}
  >
    {s}
  </Box>
)

const StatusPill = ({ s }: { s: StatusKey }) => (
  <Box
    component='span'
    sx={{
      display: 'inline-block',
      fontSize: '0.72rem',
      fontWeight: 600,
      px: 2,
      py: 0.25,
      borderRadius: 3,
      whiteSpace: 'nowrap',
      bgcolor: STATUS[s].bg,
      color: STATUS[s].fg,
      border: s === 'closed' ? '1px dashed var(--mui-palette-divider)' : 0
    }}
  >
    {STATUS[s].label}
  </Box>
)

const Tag = ({ label, color, bg = color }: { label: string; color: string; bg?: string }) => (
  <Box
    component='span'
    sx={{
      fontSize: '0.65rem',
      fontWeight: 700,
      px: 2,
      py: 0.25,
      borderRadius: 3,
      whiteSpace: 'nowrap',
      color: bg === color ? '#fff' : color,
      bgcolor: bg
    }}
  >
    {label}
  </Box>
)

const TrendIcon = ({ t }: { t: number }) =>
  t > 0 ? (
    <i className='ri-arrow-up-line' title='เพิ่มขึ้น' style={{ color: '#E5266E' }} />
  ) : t < 0 ? (
    <i className='ri-arrow-down-line' title='ลดลง' style={{ color: '#22B07D' }} />
  ) : (
    <i className='ri-subtract-line' title='คงที่' style={{ color: 'var(--mui-palette-text-secondary)' }} />
  )

const Panel = ({
  title,
  sub,
  action,
  children,
  tour
}: {
  title: string
  sub?: string
  action?: ReactNode
  children: ReactNode
  tour?: string
}) => (
  <Card sx={{ p: 5, blockSize: '100%' }} data-tour={tour}>
    <Box
      sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center', mb: 3.5 }}
    >
      <div>
        <Typography variant='h6'>{title}</Typography>
        {sub && (
          <Typography variant='body2' color='text.secondary'>
            {sub}
          </Typography>
        )}
      </div>
      {action}
    </Box>
    {children}
  </Card>
)

const ListButton = ({
  onClick,
  accent,
  title,
  tag,
  sub
}: {
  onClick: () => void
  accent?: string
  title: string
  tag: ReactNode
  sub: string
}) => (
  <ButtonBase
    onClick={onClick}
    sx={{
      display: 'block',
      inlineSize: '100%',
      textAlign: 'start',
      borderRadius: 2.5,
      px: 3,
      py: 2.5,
      mb: 2,
      border: accent ? 0 : '1px solid var(--mui-palette-divider)',
      borderInlineStart: accent ? `4px solid ${accent}` : undefined,
      bgcolor: accent ? 'action.hover' : 'transparent',
      '&:hover': { bgcolor: 'action.selected' }
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
      <Typography sx={{ fontWeight: 600, fontSize: '0.88rem' }}>{title}</Typography>
      {tag}
    </Box>
    <Typography variant='caption' color='text.secondary'>
      {sub}
    </Typography>
  </ButtonBase>
)

type KpiProps = {
  grad: string
  over: string
  title: string
  icon: string
  value: ReactNode
  sub: string
  bar?: number
  onClick: () => void
}

const Kpi = ({ grad, over, title, icon, value, sub, bar, onClick }: KpiProps) => (
  <ButtonBase
    onClick={onClick}
    sx={{
      inlineSize: '100%',
      blockSize: '100%',
      p: 4,
      borderRadius: 3.5,
      color: '#fff',
      background: `linear-gradient(135deg, ${grad})`,
      boxShadow: 'var(--mui-customShadows-sm, 0 3px 6px rgba(46,38,61,.12))',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      textAlign: 'start',
      gap: 0.5,
      transition: 'transform .15s',
      '&:hover': { transform: 'translateY(-2px)' }
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <div>
        <Typography
          sx={{
            color: 'inherit',
            fontSize: '0.68rem',
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            opacity: 0.85
          }}
        >
          {over}
        </Typography>
        <Typography sx={{ color: 'inherit', fontWeight: 600, fontSize: '0.9rem' }}>{title}</Typography>
      </div>
      <Box
        sx={{
          inlineSize: 36,
          blockSize: 36,
          borderRadius: 2.5,
          bgcolor: 'rgba(255,255,255,.22)',
          display: 'grid',
          placeItems: 'center',
          fontSize: '1.2rem',
          flexShrink: 0
        }}
      >
        <i className={icon} />
      </Box>
    </Box>
    <Typography sx={{ color: 'inherit', fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, mt: 1.5 }}>
      {value}
    </Typography>
    {bar !== undefined && (
      <LinearProgress
        variant='determinate'
        value={bar}
        sx={{
          my: 1,
          blockSize: 5,
          borderRadius: 3,
          bgcolor: 'rgba(255,255,255,.3)',
          '& .MuiLinearProgress-bar': { bgcolor: '#fff' }
        }}
      />
    )}
    <Typography sx={{ color: 'inherit', fontSize: '0.8rem', opacity: 0.92 }}>{sub}</Typography>
  </ButtonBase>
)

// ── Tables used by the drill-down dialog ──────────────────────────────

const riskColumns = (round: number): Column<Risk>[] => [
  {
    key: 'id',
    label: 'รหัส',
    render: k => (
      <Typography variant='caption' sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
        {k.id}
      </Typography>
    )
  },
  { key: 'name', label: 'ความเสี่ยง', sortable: true },
  { key: 'unit', label: 'หน่วยงาน', sortable: true },
  {
    key: 'inh',
    label: 'Inherent',
    align: 'center',
    sortable: true,
    sortValue: k => k.L * k.I,
    render: k => <ScoreChip s={k.L * k.I} />
  },
  {
    key: 'res',
    label: 'Residual',
    align: 'center',
    sortable: true,
    sortValue: k => scoreAt(k, round),
    render: k => <ScoreChip s={scoreAt(k, round)} />
  },
  { key: 'trend', label: 'แนวโน้ม', align: 'center', render: k => <TrendIcon t={trend(k, round)} /> }
]

const kriColumns: Column<Kri>[] = [
  { key: 'name', label: 'ตัวชี้วัด', sortable: true },
  { key: 'unitName', label: 'หน่วยงาน', sortable: true },
  { key: 'v', label: 'ค่าจริง', align: 'right', render: k => `${k.v} ${k.unit}` },
  { key: 'thr', label: 'เกณฑ์', align: 'right', render: k => `${k.dir === 'min' ? '≥' : '≤'} ${k.thr} ${k.unit}` },
  {
    key: 'st',
    label: 'สถานะ',
    align: 'center',
    sortable: true,
    render: k => <Tag label={k.st} color={KRI_COLOR[k.st]} />
  }
]

// ── Dashboard ─────────────────────────────────────────────────────────

const RiskDashboard = () => {
  const [filter, setFilter] = useState<FilterValues>(DEFAULT_FILTER)
  const [heat, setHeat] = useState<'inh' | 'res'>('res')
  const [stack, setStack] = useState<Drill[]>([])

  // Remember the last filter per browser (convenience only; storage may be blocked)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FILTER_KEY) ?? 'null')

      if (saved) setFilter({ ...DEFAULT_FILTER, ...saved })
    } catch {}
  }, [])

  const changeFilter = (v: FilterValues) => {
    const next = { ...DEFAULT_FILTER, ...v }

    setFilter(next)

    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(next))
    } catch {}
  }

  const v: DashView = useMemo(
    () =>
      buildView({
        year: +filter.year,
        round: +filter.round,
        unit: filter.unit === '' || filter.unit === undefined ? null : +filter.unit
      }),
    [filter]
  )

  const round = v.round
  const open = (d: Drill) => setStack(s => [...s, d])
  const openRisk = (k: Risk) => open({ kind: 'risk', title: `${k.id} · ${k.name}`, risk: k })
  const openKri = (k: Kri) => open({ kind: 'kri', title: k.name, kri: k })

  const unitRisks = (u: UnitRow) =>
    open({ kind: 'risks', title: `ความเสี่ยงของ${u.name}`, rows: v.risks.filter(k => k.ui === u.ui) })

  // Derived numbers
  const cnt = (name: string) => v.risks.filter(k => level(scoreAt(k, round)).name === name).length
  const byStatus = (s: StatusKey) => v.units.filter(u => u.st === s)
  const sent = v.units.filter(u => !['none', 'draft'].includes(u.st))
  const notSent = v.units.filter(u => ['none', 'draft', 'back'].includes(u.st))
  const pctSent = Math.round((sent.length / Math.max(1, v.units.length)) * 100)
  const red = v.kris.filter(k => k.st === 'RED')
  const amber = v.kris.filter(k => k.st === 'AMBER')
  const late = v.risks.filter(k => delayed(k, round))
  const avgProg = Math.round(v.risks.reduce((a, k) => a + progress(k, round), 0) / Math.max(1, v.risks.length))
  const top = [...v.risks].sort((a, b) => scoreAt(b, round) - scoreAt(a, round) || b.L * b.I - a.L * a.I).slice(0, 5)
  const roundLabel = ROUNDS[round].label
  const due = ROUNDS[round].due(v.year)

  const tasks = [
    {
      title: 'รอหัวหน้าหน่วยงานเห็นชอบ',
      sub: `${byStatus('head').length} หน่วยงาน`,
      tag: <Tag label='รอเห็นชอบ' color='#A66A00' bg='#FFF1D6' />,
      go: () => open({ kind: 'units', title: 'รอหัวหน้าหน่วยงานเห็นชอบ', rows: byStatus('head') })
    },
    {
      title: 'รอกองแผนงานรับรอง',
      sub: `${byStatus('plan').length} หน่วยงาน · รับรองแล้วล็อกข้อมูล`,
      tag: <Tag label='รอรับรอง' color='#4B2FD1' bg='#ECE6FF' />,
      go: () => open({ kind: 'units', title: 'รอกองแผนงานรับรอง', rows: byStatus('plan') })
    },
    {
      title: 'ตีกลับให้แก้ไขแล้วส่งใหม่',
      sub: `${byStatus('back').length} หน่วยงาน`,
      tag: <Tag label='ตีกลับ' color='#B81A55' bg='#FFE0E8' />,
      go: () => open({ kind: 'units', title: 'ตีกลับให้แก้ไข', rows: byStatus('back') })
    },
    {
      title: 'KRI ระดับ RED — แจ้ง Risk Owner',
      sub: `${red.length} ตัวชี้วัด`,
      tag: <Tag label='เร่งด่วน' color={KRI_COLOR.RED} />,
      go: () => open({ kind: 'kris', title: 'KRI ระดับ RED', rows: red })
    },
    {
      title: 'มาตรการล่าช้ากว่าแผน (ปค.5)',
      sub: `${late.length} มาตรการ`,
      tag: <Tag label='ติดตาม' color='#A66A00' bg='#FFF1D6' />,
      go: () => open({ kind: 'risks', title: 'มาตรการล่าช้ากว่าแผน', rows: late })
    },
    {
      title: `ครบกำหนดส่งรอบ${roundLabel}`,
      sub: `ภายใน ${due} · ยังไม่ส่ง ${notSent.length} หน่วยงาน`,
      tag: <Tag label='กำหนดการ' color='var(--mui-palette-text-secondary)' bg='var(--mui-palette-action-selected)' />,
      go: () => open({ kind: 'units', title: 'หน่วยงานที่ยังไม่ส่ง', rows: notSent })
    }
  ]

  const exportCsv = () => {
    const rows = [
      [
        'รหัส',
        'ความเสี่ยง',
        'ประเภท',
        'หน่วยงาน',
        'Risk Owner',
        'Inherent',
        'Residual',
        'ระดับ',
        'ความคืบหน้ามาตรการ (%)'
      ]
    ].concat(
      v.risks.map(k => [
        k.id,
        k.name,
        CATS[k.cat].name,
        k.unit,
        k.owner,
        String(k.L * k.I),
        String(scoreAt(k, round)),
        level(scoreAt(k, round)).name,
        String(progress(k, round))
      ])
    )

    const csv = '﻿' + rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')

    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `e-risk-${v.year}-round${round}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    notifySuccess(`ส่งออก ${v.risks.length} รายการแล้ว (เปิดด้วย Excel ได้)`)
  }

  // Heatmap: rows = likelihood 5→1, cols = impact 1→5
  const heatPos = (k: Risk) => (heat === 'inh' ? { L: k.L, I: k.I } : residual(k, round))

  // Donut by category
  const C = 2 * Math.PI * 60
  const total = Math.max(1, v.risks.length)
  let offset = 0

  const cats = CATS.map((c, ci) => {
    const list = v.risks.filter(k => k.cat === ci)
    const len = (list.length / total) * C
    const seg = { ...c, list, len, off: offset }

    offset += len

    return seg
  })

  const statusCounts = (Object.keys(STATUS) as StatusKey[])
    .filter(s => s !== 'closed')
    .map(s => ({ s, list: byStatus(s) }))
    .filter(x => x.list.length)

  const current = stack[stack.length - 1]

  return (
    <Box>
      {/* Header + filters */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          mb: 4
        }}
      >
        <div>
          <Typography variant='h4' component='h1'>
            ภาพรวมความเสี่ยงมหาวิทยาลัย
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            ปีงบประมาณ {v.year} · รอบ{roundLabel} (ครบกำหนด {due}) ·{' '}
            {v.unit === null ? `ทั้งมหาวิทยาลัย (${UNITS.length} หน่วยงาน)` : UNITS[v.unit]} · ข้อมูลตัวอย่าง
          </Typography>
        </div>
        <Button variant='contained' onClick={exportCsv} startIcon={<i className='ri-file-excel-2-line' />}>
          ส่งออก Excel
        </Button>
      </Box>
      <Box sx={{ mb: 5 }} data-tour='risk-filters'>
        <FilterBar fields={filterFields} values={filter} onChange={changeFilter} />
      </Box>

      {/* KPI cards */}
      <Box
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 4, mb: 5 }}
        data-tour='kpis'
      >
        <Kpi
          grad='#14A08C, #0B7C6E'
          over='ERM1 · ทะเบียนความเสี่ยง'
          title='ความเสี่ยงที่ขึ้นทะเบียน'
          icon='ri-file-list-3-line'
          value={v.risks.length}
          sub={`สูงมาก ${cnt('สูงมาก')} · สูง ${cnt('สูง')} · ปานกลาง ${cnt('ปานกลาง')}`}
          onClick={() => open({ kind: 'risks', title: 'ความเสี่ยงที่ขึ้นทะเบียน (ERM1)', rows: v.risks })}
        />
        <Kpi
          grad='#F2A93B, #DB8414'
          over='ERM2 · การส่งข้อมูล'
          title='หน่วยงานส่งข้อมูลแล้ว'
          icon='ri-send-plane-line'
          value={`${pctSent}%`}
          bar={pctSent}
          sub={`ส่งแล้ว ${sent.length} / ${v.units.length} หน่วยงาน`}
          onClick={() => open({ kind: 'units', title: `สถานะการส่ง รอบ${roundLabel}`, rows: v.units })}
        />
        <Kpi
          grad='#1E6FD9, #1553A8'
          over='ERM4 · KRI'
          title='ตัวชี้วัดเตือนภัยล่วงหน้า'
          icon='ri-pulse-line'
          value={`${red.length + amber.length} / ${v.kris.length}`}
          sub={`เกินเกณฑ์ (RED) ${red.length} · ใกล้เกณฑ์ (AMBER) ${amber.length}`}
          onClick={() => open({ kind: 'kris', title: 'KRI ที่เกินเกณฑ์หรือใกล้เกณฑ์', rows: [...red, ...amber] })}
        />
        <Kpi
          grad='#8A5A33, #5C3B1F'
          over='ปค.5 · มาตรการ'
          title='ความคืบหน้ามาตรการเฉลี่ย'
          icon='ri-loop-right-line'
          value={`${avgProg}%`}
          bar={avgProg}
          sub={`ล่าช้ากว่าแผน ${late.length} มาตรการ`}
          onClick={() => open({ kind: 'risks', title: 'มาตรการล่าช้ากว่าแผน (ปค.5)', rows: late })}
        />
        <Kpi
          grad='#E5266E, #B81A55'
          over='Workflow'
          title='รอพิจารณา / ตีกลับ'
          icon='ri-inbox-unarchive-line'
          value={byStatus('head').length + byStatus('plan').length + byStatus('back').length}
          sub={`รอเห็นชอบ ${byStatus('head').length} · รอรับรอง ${byStatus('plan').length} · ตีกลับ ${byStatus('back').length}`}
          onClick={() =>
            open({
              kind: 'units',
              title: 'รายการรอเห็นชอบ / รอรับรอง / ตีกลับ',
              rows: v.units.filter(u => ['head', 'plan', 'back'].includes(u.st))
            })
          }
        />
      </Box>

      <Grid container spacing={4}>
        {/* Heatmap */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Panel
            tour='heatmap'
            title={`Risk Heatmap 5×5 — ${heat === 'inh' ? 'ก่อนควบคุม (Inherent)' : 'หลังควบคุม (Residual)'}`}
            sub='คลิกช่องเพื่อดูรายการความเสี่ยง · คะแนน = โอกาส × ผลกระทบ'
            action={
              <ToggleButtonGroup
                size='small'
                exclusive
                value={heat}
                onChange={(_, x) => x && setHeat(x)}
                aria-label='ประเภทคะแนน'
              >
                <ToggleButton value='inh'>Inherent</ToggleButton>
                <ToggleButton value='res'>Residual</ToggleButton>
              </ToggleButtonGroup>
            }
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
              {LEVELS.map(l => (
                <Tag key={l.label} label={l.label} color={l.color} />
              ))}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '24px repeat(5, minmax(0, 1fr))', gap: 1.5 }}>
              {[5, 4, 3, 2, 1].flatMap(L => [
                <Box
                  key={`l${L}`}
                  sx={{ display: 'grid', placeItems: 'center', color: 'text.secondary', fontSize: '0.8rem' }}
                >
                  {L}
                </Box>,
                ...[1, 2, 3, 4, 5].map(I => {
                  const list = v.risks.filter(k => {
                    const p = heatPos(k)

                    return p.L === L && p.I === I
                  })

                  return (
                    <ButtonBase
                      key={`${L}${I}`}
                      aria-label={`โอกาส ${L} ผลกระทบ ${I}: ${list.length} รายการ`}
                      onClick={() =>
                        open({
                          kind: 'risks',
                          title: `ความเสี่ยงในช่อง โอกาส ${L} × ผลกระทบ ${I} (${heat === 'inh' ? 'Inherent' : 'Residual'})`,
                          rows: list
                        })
                      }
                      sx={{
                        borderRadius: 2.5,
                        color: '#fff',
                        bgcolor: level(L * I).color,
                        opacity: list.length ? 1 : 0.35,
                        minBlockSize: { xs: 44, sm: 58 },
                        flexDirection: 'column',
                        transition: 'transform .12s',
                        '&:hover': { transform: 'scale(1.03)' }
                      }}
                    >
                      <Box component='b' sx={{ fontSize: { xs: '1.05rem', sm: '1.3rem' }, lineHeight: 1 }}>
                        {list.length}
                      </Box>
                      <Box
                        component='small'
                        sx={{ fontSize: '0.65rem', opacity: 0.9, display: { xs: 'none', sm: 'block' } }}
                      >
                        คะแนน {L * I}
                      </Box>
                    </ButtonBase>
                  )
                })
              ])}
              <span />
              {[1, 2, 3, 4, 5].map(i => (
                <Box key={`i${i}`} sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '0.8rem' }}>
                  {i}
                </Box>
              ))}
            </Box>
            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
              ผลกระทบ (Impact) → · ↑ โอกาสเกิด (Likelihood)
            </Typography>
          </Panel>
        </Grid>

        {/* KRI watchlist */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Panel
            title='KRI ที่ต้องเฝ้าระวัง'
            action={
              <Button size='small' onClick={() => open({ kind: 'kris', title: 'KRI ทั้งหมด', rows: v.kris })}>
                ดูทั้งหมด →
              </Button>
            }
          >
            {red.length + amber.length ? (
              [...red, ...amber]
                .slice(0, 5)
                .map(k => (
                  <ListButton
                    key={`${k.ui}-${k.name}`}
                    onClick={() => openKri(k)}
                    accent={KRI_COLOR[k.st]}
                    title={k.name}
                    tag={<Tag label={k.st} color={KRI_COLOR[k.st]} />}
                    sub={`ค่าจริง ${k.v} ${k.unit} · เกณฑ์ ${k.dir === 'min' ? '≥' : '≤'} ${k.thr} ${k.unit} · ${k.unitName}`}
                  />
                ))
            ) : (
              <EmptyState icon='ri-checkbox-circle-line' title='ไม่มี KRI ที่เกินหรือใกล้เกณฑ์ในรอบนี้' />
            )}
          </Panel>
        </Grid>

        {/* Submission matrix */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Panel
            title='สถานะการส่งข้อมูล หน่วยงาน × รอบ'
            sub={`รอบ${roundLabel} ครบกำหนด ${due} · คลิกชื่อหน่วยงานเพื่อดูความเสี่ยง`}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
              {statusCounts.map(x => (
                <ButtonBase
                  key={x.s}
                  sx={{ gap: 1, borderRadius: 3 }}
                  onClick={() =>
                    open({ kind: 'units', title: `${STATUS[x.s].label} — รอบ${roundLabel}`, rows: x.list })
                  }
                >
                  <StatusPill s={x.s} />
                  <b>{x.list.length}</b>
                </ButtonBase>
              ))}
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>หน่วยงาน</TableCell>
                    {ROUNDS.map((r, i) => (
                      <TableCell key={r.label} sx={i === round ? { color: 'primary.main' } : undefined}>
                        {r.short}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {v.units.map(u => (
                    <TableRow key={u.ui} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <ButtonBase
                          onClick={() => unitRisks(u)}
                          sx={{ fontSize: 'inherit', '&:hover': { color: 'primary.main' } }}
                        >
                          {u.name}
                        </ButtonBase>
                      </TableCell>
                      {u.all.map((s, i) => (
                        <TableCell key={i}>
                          <StatusPill s={s} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Panel>
        </Grid>

        {/* Category donut */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Panel title='ความเสี่ยงแยกตามประเภท'>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <svg viewBox='0 0 160 160' width='190' height='190' role='img' aria-label='สัดส่วนความเสี่ยงตามประเภท'>
                {cats.map((c, ci) => (
                  <circle
                    key={c.name}
                    cx='80'
                    cy='80'
                    r='60'
                    fill='none'
                    stroke={c.color}
                    strokeWidth='26'
                    strokeDasharray={`${c.len} ${C - c.len}`}
                    strokeDashoffset={-c.off}
                    transform='rotate(-90 80 80)'
                    style={{ cursor: 'pointer' }}
                    onClick={() => open({ kind: 'risks', title: `ความเสี่ยงด้าน${CATS[ci].name}`, rows: c.list })}
                  >
                    <title>{`${c.name}: ${c.list.length}`}</title>
                  </circle>
                ))}
                <text x='80' y='78' textAnchor='middle' fontSize='26' fontWeight='800' fill='currentColor'>
                  {v.risks.length}
                </text>
                <text x='80' y='98' textAnchor='middle' fontSize='11' fill='currentColor' opacity='.6'>
                  ความเสี่ยง
                </text>
              </svg>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, inlineSize: '100%' }}>
                {cats.map((c, ci) => (
                  <ButtonBase
                    key={c.name}
                    onClick={() => open({ kind: 'risks', title: `ความเสี่ยงด้าน${CATS[ci].name}`, rows: c.list })}
                    sx={{
                      justifyContent: 'flex-start',
                      gap: 1.5,
                      p: 1,
                      borderRadius: 1.5,
                      fontSize: '0.8rem',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <Box sx={{ inlineSize: 10, blockSize: 10, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
                    {c.name}
                    <Box component='b' sx={{ marginInlineStart: 'auto' }}>
                      {c.list.length}
                    </Box>
                  </ButtonBase>
                ))}
              </Box>
            </Box>
          </Panel>
        </Grid>

        {/* Top 5 */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Panel
            title='Top 5 ความเสี่ยงคงเหลือสูงสุด'
            action={
              <Button
                size='small'
                onClick={() =>
                  open({
                    kind: 'risks',
                    title: 'ทะเบียนความเสี่ยงทั้งหมด',
                    rows: [...v.risks].sort((a, b) => scoreAt(b, round) - scoreAt(a, round))
                  })
                }
              >
                ทะเบียนความเสี่ยง →
              </Button>
            }
          >
            <DataTable
              rows={top}
              columns={riskColumns(round)}
              getRowId={k => k.id}
              onRowClick={openRisk}
              empty={<EmptyState title='ไม่มีความเสี่ยงตามเงื่อนไขนี้' description='ลองเปลี่ยนหน่วยงานหรือรอบรายงาน' />}
            />
          </Panel>
        </Grid>

        {/* Tasks */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Panel title='งานที่ต้องดำเนินการ' tour='tasks'>
            {tasks.map(t => (
              <ListButton key={t.title} onClick={t.go} title={t.title} tag={t.tag} sub={t.sub} />
            ))}
          </Panel>
        </Grid>
      </Grid>

      {/* Drill-down dialog (stack → "ย้อนกลับ" returns to the list you came from) */}
      <Dialog open={!!current} onClose={() => setStack([])} maxWidth='md' fullWidth aria-labelledby='drill-title'>
        {current && (
          <>
            <DialogTitle id='drill-title' sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {stack.length > 1 && (
                <IconButton aria-label='ย้อนกลับ' onClick={() => setStack(s => s.slice(0, -1))}>
                  <i className='ri-arrow-left-line' />
                </IconButton>
              )}
              <Box sx={{ flex: 1 }}>{current.title}</Box>
              <IconButton aria-label='ปิด' onClick={() => setStack([])}>
                <i className='ri-close-line' />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <DrillBody
                d={current}
                round={round}
                onRisk={openRisk}
                onKri={openKri}
                onUnit={unitRisks}
                risksOf={ui => v.risks.filter(k => k.ui === ui).length}
              />
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  )
}

type DrillBodyProps = {
  d: Drill
  round: number
  onRisk: (k: Risk) => void
  onKri: (k: Kri) => void
  onUnit: (u: UnitRow) => void
  risksOf: (ui: number) => number
}

const KV = ({ items }: { items: [string, ReactNode][] }) => (
  <Box
    component='dl'
    sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '140px 1fr' }, gap: '8px 12px', m: 0, mb: 4 }}
  >
    {items.map(([k, val]) => [
      <Typography key={`k${k}`} component='dt' color='text.secondary'>
        {k}
      </Typography>,
      <Box key={`v${k}`} component='dd' sx={{ m: 0 }}>
        {val}
      </Box>
    ])}
  </Box>
)

const RoundGrid = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' },
      gap: 2,
      textAlign: 'center'
    }}
  >
    {children}
  </Box>
)

const RoundBox = ({ label, active, children }: { label: string; active?: boolean; children: ReactNode }) => (
  <Box sx={{ border: '1px solid', borderColor: active ? 'primary.main' : 'divider', borderRadius: 2.5, p: 2 }}>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <div>{children}</div>
  </Box>
)

const DrillBody = ({ d, round, onRisk, onKri, onUnit, risksOf }: DrillBodyProps) => {
  if (d.kind === 'risks')
    return (
      <DataTable
        rows={d.rows}
        columns={riskColumns(round)}
        getRowId={k => k.id}
        onRowClick={onRisk}
        initialSort={{ key: 'res', dir: 'desc' }}
        empty={<EmptyState title='ไม่พบรายการความเสี่ยง' description='ไม่มีความเสี่ยงตามเงื่อนไขนี้' />}
      />
    )

  if (d.kind === 'kris')
    return (
      <DataTable
        rows={d.rows}
        columns={kriColumns}
        getRowId={k => `${k.ui}-${k.name}`}
        onRowClick={onKri}
        empty={<EmptyState icon='ri-checkbox-circle-line' title='ไม่มี KRI ตามเงื่อนไขนี้' />}
      />
    )

  if (d.kind === 'units')
    return (
      <DataTable
        rows={d.rows}
        getRowId={u => String(u.ui)}
        onRowClick={onUnit}
        columns={[
          { key: 'name', label: 'หน่วยงาน', sortable: true },
          { key: 'st', label: 'สถานะรอบนี้', render: u => <StatusPill s={u.st} /> },
          { key: 'n', label: 'จำนวนความเสี่ยง', align: 'right', render: u => risksOf(u.ui) }
        ]}
        empty={<EmptyState icon='ri-checkbox-circle-line' title='ไม่มีหน่วยงานในสถานะนี้' />}
      />
    )

  if (d.kind === 'kri') {
    const k = d.kri

    return (
      <>
        <KV
          items={[
            ['หน่วยงาน', k.unitName],
            ['ค่าจริงรอบนี้', <b key='v'>{`${k.v} ${k.unit}`}</b>],
            ['เกณฑ์', `${k.dir === 'min' ? 'ไม่ต่ำกว่า' : 'ไม่เกิน'} ${k.thr} ${k.unit}`],
            ['สถานะ', <Tag key='s' label={k.st} color={KRI_COLOR[k.st]} />]
          ]}
        />
        <RoundGrid>
          {ROUNDS.map((r, i) => {
            const x = kriValue(k, i)

            return (
              <RoundBox key={r.label} label={r.label} active={i === round}>
                <b style={{ color: KRI_COLOR[kriStatus(k, x)] }}>{`${x} ${k.unit}`}</b>
              </RoundBox>
            )
          })}
        </RoundGrid>
      </>
    )
  }

  const k = d.risk
  const p = progress(k, round)
  const late = delayed(k, round)

  return (
    <>
      <KV
        items={[
          ['หน่วยงาน', k.unit],
          ['ประเภท', CATS[k.cat].name],
          ['Risk Owner', k.owner],
          ['มาตรการ (ERM3)', k.measure],
          [
            'ความคืบหน้า',
            <Box key='p' sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <LinearProgress
                variant='determinate'
                value={p}
                color={late ? 'warning' : 'success'}
                sx={{ flex: 1, blockSize: 8, borderRadius: 4 }}
              />
              <b>{p}%</b>
              {late && <Tag label='ล่าช้า' color='#F27A1F' />}
            </Box>
          ]
        ]}
      />
      <RoundGrid>
        <RoundBox label='Inherent'>
          <ScoreChip s={k.L * k.I} />
          <Typography variant='caption' sx={{ display: 'block' }}>{`L${k.L} × I${k.I}`}</Typography>
        </RoundBox>
        {ROUNDS.map((r, i) => {
          const x = residual(k, i)

          return (
            <RoundBox key={r.label} label={r.label} active={i === round}>
              <ScoreChip s={x.L * x.I} />
              <Typography variant='caption' sx={{ display: 'block' }}>{`L${x.L} × I${x.I}`}</Typography>
            </RoundBox>
          )
        })}
      </RoundGrid>
    </>
  )
}

export default RiskDashboard
