'use client'

// Loading / empty / error states. Every list and form uses these instead of a blank area.
import type { ReactNode } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

type StateProps = {
  icon?: string
  title: string
  description?: string

  /** The next thing the user can do, e.g. a "สร้างคำขอ" button. */
  action?: ReactNode
}

const StateBlock = ({ icon, title, description, action, color }: StateProps & { color: string }) => (
  <Stack role='status' alignItems='center' spacing={2} sx={{ py: 10, px: 4, textAlign: 'center' }}>
    {icon && <i className={`${icon} text-[40px]`} style={{ color }} aria-hidden />}
    <Typography variant='h6'>{title}</Typography>
    {description && (
      <Typography color='text.secondary' sx={{ maxInlineSize: 420 }}>
        {description}
      </Typography>
    )}
    {action}
  </Stack>
)

export const EmptyState = ({ icon = 'ri-inbox-line', ...rest }: StateProps) => (
  <StateBlock icon={icon} color='var(--mui-palette-text-disabled)' {...rest} />
)

export const ErrorState = ({
  title = 'โหลดข้อมูลไม่สำเร็จ',
  description,
  onRetry
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) => (
  <StateBlock
    icon='ri-error-warning-line'
    color='var(--mui-palette-error-main)'
    title={title}
    description={description}
    action={
      onRetry && (
        <Button variant='outlined' onClick={onRetry} startIcon={<i className='ri-refresh-line' />}>
          ลองอีกครั้ง
        </Button>
      )
    }
  />
)

/** Placeholder rows while a table loads. */
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <Box aria-busy='true' aria-label='กำลังโหลด' sx={{ p: 4 }}>
    {Array.from({ length: rows }, (_, i) => (
      <Skeleton key={i} variant='rounded' height={36} sx={{ mb: 2 }} />
    ))}
  </Box>
)
