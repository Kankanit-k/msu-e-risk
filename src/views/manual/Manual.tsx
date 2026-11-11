'use client'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import GlobalStyles from '@mui/material/GlobalStyles'
import Typography from '@mui/material/Typography'

// Data Imports
import type { PageHelp } from '@/data/help'

// Config Imports
import themeConfig from '@configs/themeConfig'

export type ManualPage = PageHelp & {
  route: string
  slug: string
  video: string | null
  captions: string | null
  shots: (string | null)[]
}

// Print = the manual itself: drop the app chrome and keep each step with its screenshot.
const printStyles = (
  <GlobalStyles
    styles={{
      '@media print': {
        'nav, header, footer, aside, .ts-vertical-nav-root, .no-print': { display: 'none !important' },
        '.ts-vertical-layout-content-wrapper, .ts-horizontal-layout-content-wrapper': { marginInlineStart: '0 !important' },
        '.manual-page': { breakBefore: 'page', boxShadow: 'none !important', border: 'none !important' },
        '.manual-page:first-of-type': { breakBefore: 'auto' },
        '.manual-step': { breakInside: 'avoid' }
      }
    }}
  />
)

const Manual = ({ pages, pdf }: { pages: ManualPage[]; pdf: string | null }) => {
  const hasShots = pages.some(p => p.shots.some(Boolean))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6, maxInlineSize: 960, mx: 'auto' }}>
      {printStyles}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 3 }}>
        <div>
          <Typography variant='h4'>คู่มือการใช้งาน</Typography>
          <Typography color='text.secondary'>{themeConfig.templateSubtitle}</Typography>
        </div>
        {pdf ? (
          <Button className='no-print' variant='contained' href={pdf} download startIcon={<i className='ri-file-pdf-2-line' />}>
            ดาวน์โหลด PDF
          </Button>
        ) : (
          <Button className='no-print' variant='contained' onClick={() => window.print()} startIcon={<i className='ri-printer-line' />}>
            พิมพ์ / บันทึกเป็น PDF
          </Button>
        )}
      </Box>

      {!hasShots && (
        <Alert severity='info' className='no-print'>
          ยังไม่มีภาพประกอบ ผู้พัฒนาสร้างได้ด้วยคำสั่ง <code>pnpm manual:capture</code>
        </Alert>
      )}

      <Box component='nav' aria-label='สารบัญ' className='no-print' sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {pages.map(p => (
          <Button key={p.slug} size='small' variant='outlined' href={`#${p.slug}`}>
            {p.title}
          </Button>
        ))}
      </Box>

      {pages.map(p => (
        <Card key={p.slug} id={p.slug} className='manual-page' component='section' aria-labelledby={`${p.slug}-title`}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>
              <Typography id={`${p.slug}-title`} variant='h5'>
                {p.title}
              </Typography>
              <Typography color='text.secondary'>{p.summary}</Typography>
              <Link href={p.route} className='no-print'>
                <Typography variant='body2' color='primary' component='span'>
                  เปิดหน้านี้ →
                </Typography>
              </Link>
            </div>

            {p.video && (
              <Box className='no-print' component='video' controls preload='metadata' sx={{ inlineSize: '100%', borderRadius: 1, bgcolor: 'black' }}>
                <source src={p.video} type='video/mp4' />
                {p.captions && <track kind='captions' srcLang='th' label='ไทย' src={p.captions} default />}
              </Box>
            )}

            <Box component='ol' sx={{ m: 0, pl: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {p.steps.map((s, i) => (
                <li key={i} className='manual-step'>
                  <Typography variant='subtitle1' fontWeight={600}>
                    {s.title}
                  </Typography>
                  <Typography color='text.secondary' sx={{ mb: p.shots[i] ? 2 : 0 }}>
                    {s.body}
                  </Typography>
                  {p.shots[i] && (
                    <Box
                      component='img'
                      src={p.shots[i]!}
                      alt={`${p.title} — ${s.title}`}
                      loading='lazy'
                      sx={{ inlineSize: '100%', borderRadius: 1, border: 1, borderColor: 'divider' }}
                    />
                  )}
                </li>
              ))}
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}

export default Manual
