'use client'

// The ONE filter component. Each page passes its own field list; the first 4 fields show inline,
// the rest sit under "ตัวกรองเพิ่มเติม". Values are controlled by the page, so the data reacts live.
import { useState } from 'react'

// MUI Imports
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

export type FilterField = {
  key: string
  label: string

  /** 'search' = free-text box with an icon; 'select' needs options; 'date' = yyyy-mm-dd. */
  type: 'search' | 'text' | 'select' | 'date'
  options?: { value: string; label: string }[]
  placeholder?: string
}

export type FilterValues = Record<string, string>

const VISIBLE = 4

type Props = {
  fields: FilterField[]
  values: FilterValues
  onChange: (values: FilterValues) => void
}

const FilterBar = ({ fields, values, onChange }: Props) => {
  const [more, setMore] = useState(false)
  const set = (key: string, value: string) => onChange({ ...values, [key]: value })
  const active = fields.filter(f => values[f.key])
  const hidden = fields.slice(VISIBLE)
  const hiddenActive = hidden.filter(f => values[f.key]).length

  const render = (f: FilterField) => (
    <TextField
      key={f.key}
      size='small'
      label={f.label}
      placeholder={f.placeholder}
      value={values[f.key] ?? ''}
      onChange={e => set(f.key, e.target.value)}
      select={f.type === 'select'}
      type={f.type === 'date' ? 'date' : 'text'}
      sx={{ minInlineSize: f.type === 'search' ? 240 : 180, flex: f.type === 'search' ? '1 1 240px' : '0 1 200px' }}
      slotProps={{
        inputLabel: f.type === 'date' ? { shrink: true } : undefined,
        input:
          f.type === 'search'
            ? {
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='ri-search-line' aria-hidden />
                  </InputAdornment>
                )
              }
            : undefined
      }}
    >
      {f.type === 'select' && [
        <MenuItem key='' value=''>
          ทั้งหมด
        </MenuItem>,
        ...(f.options ?? []).map(o => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))
      ]}
    </TextField>
  )

  return (
    <Box role='search' className='no-print'>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
        {fields.slice(0, VISIBLE).map(render)}
        {hidden.length > 0 && (
          <Badge color='primary' badgeContent={hiddenActive} invisible={!hiddenActive}>
            <Button
              variant='text'
              onClick={() => setMore(m => !m)}
              aria-expanded={more}
              endIcon={<i className={more ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />}
            >
              ตัวกรองเพิ่มเติม
            </Button>
          </Badge>
        )}
        {active.length > 0 && (
          <Button variant='text' color='secondary' onClick={() => onChange({})} startIcon={<i className='ri-close-line' />}>
            ล้างตัวกรอง
          </Button>
        )}
      </Box>
      {hidden.length > 0 && (
        <Collapse in={more}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, pt: 3 }}>{hidden.map(render)}</Box>
        </Collapse>
      )}
    </Box>
  )
}

export default FilterBar
