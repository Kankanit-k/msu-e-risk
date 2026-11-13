'use client'

// Two-level L or I picker (ประเด็น → ระดับ 1–5) with the "3|ปานกลาง" chip. Used by ERM2 (initial),
// ERM3 (expected) and ERM4 (level at a round).
// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// Lib Imports
import { RATING_KINDS, scoreTag } from '@/services/erm2Types'
import type { RatingKind } from '@/services/erm2Types'

/** A rating while editing: the score is missing until the second select is set. */
export type DraftRating = { criterion: string; score?: number }

type Props = {
  kind: RatingKind
  value?: DraftRating
  onChange: (v?: DraftRating) => void
  showErrors?: boolean
}

const RatingPicker = ({ kind, value: r, onChange, showErrors }: Props) => {
  const k = RATING_KINDS[kind]
  const criterion = k.criteria.find(c => c.key === r?.criterion)
  const missing = showErrors && r && !r.score

  return (
    <Card variant='outlined' sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 600, flex: 1 }}>
          {k.title}
        </Typography>
        {r && (
          <Button size='small' color='secondary' onClick={() => onChange(undefined)}>
            ล้าง
          </Button>
        )}
        {r?.score ? (
          <Chip
            size='small'
            variant='outlined'
            color={r.score >= 4 ? 'error' : r.score === 3 ? 'warning' : 'success'}
            label={scoreTag(r.score)}
            sx={{ fontWeight: 700 }}
          />
        ) : null}
      </Box>
      <Stack spacing={3}>
        <TextField
          select
          label={kind === 'likelihood' ? 'ประเด็นที่พิจารณาโอกาสที่จะเกิดความเสี่ยง' : 'ความเสียหาย/ผลกระทบต่อองค์กร'}
          value={r?.criterion ?? ''}
          onChange={e => onChange({ criterion: e.target.value })}
        >
          {k.criteria.map(c => (
            <MenuItem key={c.key} value={c.key} sx={{ whiteSpace: 'normal' }}>
              {c.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={kind === 'likelihood' ? 'ความถี่ / ความเป็นไปได้' : 'ระดับความเสียหาย'}
          value={r?.score ?? ''}
          disabled={!criterion}
          error={!!missing}
          helperText={!criterion ? 'เลือกประเด็นก่อน' : missing ? 'กรุณาเลือกระดับ' : undefined}
          onChange={e => onChange({ criterion: r!.criterion, score: Number(e.target.value) })}
        >
          {(criterion?.options ?? []).map((o, j) => (
            <MenuItem key={j} value={j + 1} sx={{ whiteSpace: 'normal' }}>
              {j + 1} — {o}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Card>
  )
}

export default RatingPicker

/** Error text when a criterion is chosen but its level is not. */
export const ratingPairError = (f: { likelihood?: DraftRating; impact?: DraftRating }) =>
  (f.likelihood && !f.likelihood.score) || (f.impact && !f.impact.score)
    ? 'เลือกเกณฑ์แล้ว กรุณาเลือกระดับให้ครบทั้ง L และ I'
    : undefined
