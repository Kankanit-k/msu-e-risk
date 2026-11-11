'use client'

// Upload one file to POST /api/files and report the stored id. The server is the real check
// (type by magic bytes, size by UPLOAD_MAX_MB); `accept` and `maxMb` here only give early feedback.
// Usage: <FileUpload onUploaded={f => setAttachmentId(f.id)} />
import { useId, useState } from 'react'

// MUI Imports
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export type UploadedFile = { id: string; name: string; type: string; size: number }

type Props = {
  onUploaded?: (file: UploadedFile) => void
  accept?: string
  maxMb?: number
  label?: string
}

const basePath = process.env.NEXT_PUBLIC_BASEPATH?.startsWith('/') ? process.env.NEXT_PUBLIC_BASEPATH : ''

const MESSAGES: Record<string, string> = {
  login_required: 'กรุณาเข้าสู่ระบบก่อนอัปโหลด',
  too_large: 'ไฟล์ใหญ่เกินกำหนด',
  type_not_allowed: 'ไม่รองรับไฟล์ชนิดนี้ หรือเนื้อไฟล์ไม่ตรงกับนามสกุล',
  empty_file: 'ไฟล์ว่างเปล่า',
  too_many_requests: 'อัปโหลดถี่เกินไป กรุณารอสักครู่'
}

export const fileUrl = (id: string) => `${basePath}/api/files/${id}/`

const FileUpload = ({ onUploaded, accept = '.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx', maxMb = 10, label = 'เลือกไฟล์' }: Props) => {
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<UploadedFile | null>(null)

  const upload = async (file: File) => {
    setError(null)
    setDone(null)
    if (file.size > maxMb * 1024 * 1024) return setError(`ไฟล์ใหญ่เกิน ${maxMb} MB`)

    setBusy(true)

    try {
      const body = new FormData()

      body.append('file', file)
      const res = await fetch(`${basePath}/api/files/`, { method: 'POST', body })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) return setError(MESSAGES[json.error] ?? 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่')
      setDone(json)
      onUploaded?.(json)
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={1.5} data-tour='file-upload'>
      <Stack direction='row' spacing={2} alignItems='center'>
        <Button component='label' htmlFor={inputId} variant='outlined' disabled={busy} startIcon={<i className='ri-upload-2-line' />}>
          {label}
          <input
            id={inputId}
            type='file'
            hidden
            accept={accept}
            onChange={e => {
              const file = e.target.files?.[0]

              e.target.value = ''
              if (file) void upload(file)
            }}
          />
        </Button>
        <Typography variant='body2' color='text.secondary'>
          {accept.replaceAll(',', ' ')} · ไม่เกิน {maxMb} MB
        </Typography>
      </Stack>
      {busy && <LinearProgress aria-label='กำลังอัปโหลด' />}
      {error && (
        <Alert severity='error' role='alert'>
          {error}
        </Alert>
      )}
      {done && (
        <Alert severity='success'>
          อัปโหลดแล้ว: <Link href={fileUrl(done.id)}>{done.name}</Link>
        </Alert>
      )}
    </Stack>
  )
}

export default FileUpload
