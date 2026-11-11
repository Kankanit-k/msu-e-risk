'use client'

// Paged, sortable table that stacks into cards on phones. Filtering/search is owned by the page
// (via FilterBar) and passed in as already-filtered `rows`, so it survives paging and sorting.
// Paging resets to the first page only when `resetKey` (e.g. the filter values) changes.
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

// Component Imports
import { EmptyState, ErrorState, TableSkeleton } from './StateViews'

export type Column<T> = {
  key: string
  label: string

  /** Cell content; defaults to String(row[key]). */
  render?: (row: T) => ReactNode

  /** Value used for sorting; defaults to row[key]. Omit `sortable` to disable. */
  sortValue?: (row: T) => string | number
  sortable?: boolean
  align?: 'left' | 'right' | 'center'

  /** Leave out of the mobile card (keep cards short). */
  hideOnMobile?: boolean
}

type Props<T> = {
  rows: T[]
  columns: Column<T>[]
  getRowId: (row: T) => string
  loading?: boolean
  error?: string | null
  onRetry?: () => void

  /** Rendered when `rows` is empty (after filtering). */
  empty?: ReactNode

  /** Per-row buttons (last column / card footer). */
  actions?: (row: T) => ReactNode
  onRowClick?: (row: T) => void
  resetKey?: string
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  pageSizes?: number[]
}

const cellValue = <T,>(row: T, col: Column<T>) => (col.sortValue ? col.sortValue(row) : ((row as Record<string, unknown>)[col.key] as string | number))

const DataTable = <T,>({
  rows,
  columns,
  getRowId,
  loading,
  error,
  onRetry,
  empty,
  actions,
  onRowClick,
  resetKey = '',
  initialSort,
  pageSizes = [10, 25, 50]
}: Props<T>) => {
  const isMobile = useMediaQuery((t: Theme) => t.breakpoints.down('sm'))
  const [sort, setSort] = useState(initialSort)
  const [pageSize, setPageSize] = useState(pageSizes[0])
  const [page, setPage] = useState(0)
  const [seenKey, setSeenKey] = useState(resetKey)

  // New filter → back to page 1 (sort and page size stay). Adjusting state during render is the
  // React-recommended alternative to an effect here.
  if (seenKey !== resetKey) {
    setSeenKey(resetKey)
    setPage(0)
  }

  const sorted = useMemo(() => {
    const col = sort && columns.find(c => c.key === sort.key)

    if (!col) return rows

    const dir = sort!.dir === 'asc' ? 1 : -1

    return [...rows].sort((a, b) => {
      const x = cellValue(a, col)
      const y = cellValue(b, col)

      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'th')) * dir
    })
  }, [rows, columns, sort])

  const lastPage = Math.max(0, Math.ceil(sorted.length / pageSize) - 1)
  const current = Math.min(page, lastPage)
  const pageRows = sorted.slice(current * pageSize, current * pageSize + pageSize)

  if (loading) return <TableSkeleton />
  if (error) return <ErrorState description={error} onRetry={onRetry} />
  if (!rows.length) return <>{empty ?? <EmptyState title='ไม่พบข้อมูล' description='ลองเปลี่ยนหรือล้างตัวกรอง' />}</>

  const toggleSort = (key: string) =>
    setSort(s => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const cell = (row: T, col: Column<T>) => (col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? ''))

  const pagination = (
    <TablePagination
      component='div'
      className='no-print'
      count={sorted.length}
      page={current}
      onPageChange={(_, p) => setPage(p)}
      rowsPerPage={pageSize}
      onRowsPerPageChange={e => {
        setPageSize(Number(e.target.value))
        setPage(0)
      }}
      rowsPerPageOptions={pageSizes}
      labelRowsPerPage='แถวต่อหน้า'
      labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
    />
  )

  if (isMobile) {
    return (
      <Box>
        <Stack spacing={3} sx={{ p: 3 }}>
          {pageRows.map(row => (
            <Card
              key={getRowId(row)}
              variant='outlined'
              data-testid='row-card'
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              sx={{ p: 3, cursor: onRowClick ? 'pointer' : undefined }}
            >
              <Stack spacing={1}>
                {columns
                  .filter(c => !c.hideOnMobile)
                  .map(c => (
                    <Box key={c.key} sx={{ display: 'flex', justifyContent: 'space-between', gap: 3 }}>
                      <Typography variant='body2' color='text.secondary'>
                        {c.label}
                      </Typography>
                      <Box sx={{ textAlign: 'end' }}>{cell(row, c)}</Box>
                    </Box>
                  ))}
              </Stack>
              {actions && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }} onClick={e => e.stopPropagation()}>
                  {actions(row)}
                </Box>
              )}
            </Card>
          ))}
        </Stack>
        {pagination}
      </Box>
    )
  }

  return (
    <Box>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              {columns.map(c => (
                <TableCell key={c.key} align={c.align} sortDirection={sort?.key === c.key ? sort.dir : false}>
                  {c.sortable ? (
                    <TableSortLabel active={sort?.key === c.key} direction={sort?.key === c.key ? sort.dir : 'asc'} onClick={() => toggleSort(c.key)}>
                      {c.label}
                    </TableSortLabel>
                  ) : (
                    c.label
                  )}
                </TableCell>
              ))}
              {actions && <TableCell align='right' className='no-print' aria-label='การทำงาน' />}
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map(row => (
              <TableRow
                key={getRowId(row)}
                hover={!!onRowClick}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                sx={{ cursor: onRowClick ? 'pointer' : undefined }}
              >
                {columns.map(c => (
                  <TableCell key={c.key} align={c.align}>
                    {cell(row, c)}
                  </TableCell>
                ))}
                {actions && (
                  <TableCell align='right' className='no-print' onClick={e => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                    {actions(row)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination}
    </Box>
  )
}

export default DataTable
