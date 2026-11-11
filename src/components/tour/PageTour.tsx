'use client'

// In-app guided tour. Steps come from src/data/help (same source as /manual and the chatbot).
// Plays automatically the first time a user opens a page that has help; the navbar button replays it.

// React Imports
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// Next Imports
import { usePathname } from 'next/navigation'

// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
import Portal from '@mui/material/Portal'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

// Data Imports
import { helpFor } from '@/data/help'
import type { HelpStep } from '@/data/help'

// Config Imports
import themeConfig from '@configs/themeConfig'

const seenKey = (path: string) => `${themeConfig.templateName.toLowerCase()}-tour-seen:${path}`

// Storage can be missing or throw (private mode, blocked site data) — the tour still works, it just won't auto-start.
const wasSeen = (path: string) => {
  try {
    return localStorage.getItem(seenKey(path)) === '1'
  } catch {
    return true
  }
}

const markSeen = (path: string) => {
  try {
    localStorage.setItem(seenKey(path), '1')
  } catch {}
}

const findTarget = (step?: HelpStep) => (step?.target ? document.querySelector<HTMLElement>(step.target) : null)

const PageTour = () => {
  const pathname = usePathname()
  const page = helpFor(pathname)
  const [steps, setSteps] = useState<{ step: HelpStep; n: number }[] | null>(null)
  const [index, setIndex] = useState(0)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const start = useCallback(() => {
    if (!page) return

    // A step whose target isn't on screen (role-hidden, collapsed layout) is skipped, not an error.
    const visible = page.help.steps.map((step, n) => ({ step, n })).filter(({ step }) => !step.target || findTarget(step))

    if (!visible.length) return
    setIndex(0)
    setSteps(visible)
  }, [page])

  const close = useCallback(() => {
    if (page) markSeen(page.path)
    setSteps(null)
    buttonRef.current?.focus() // return focus to where the tour can be replayed
  }, [page])

  // Auto-start once per page per browser. The delay lets client data (lists, cards) render first.
  useEffect(() => {
    setSteps(null)
    if (!page || !themeConfig.tourAutoStart || wasSeen(page.path)) return

    const t = setTimeout(start, 700)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.path])

  const current = steps?.[index]
  const step = current?.step

  // Follow the target through scroll/resize so the spotlight never drifts.
  useLayoutEffect(() => {
    if (!step) return

    const el = findTarget(step)

    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    setAnchor(el)

    const update = () => setRect(el ? el.getBoundingClientRect() : null)

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    cardRef.current?.focus()

    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [step])

  const interactive = Boolean(step?.waitFor && anchor)
  const last = steps ? index === steps.length - 1 : false
  const next = useCallback(() => (last ? close() : setIndex(i => i + 1)), [last, close])
  const back = useCallback(() => setIndex(i => Math.max(0, i - 1)), [])

  // Interactive step: advance once the user actually does what the step asks.
  useEffect(() => {
    const el = findTarget(step)

    if (!step?.waitFor || !el) return

    const done = (e: Event) => {
      if (step.waitFor === 'input' && !(e.target as HTMLInputElement).value?.trim()) return
      next()
    }

    const type = step.waitFor === 'click' ? 'click' : 'change'

    el.addEventListener(type, done)

    return () => el.removeEventListener(type, done)
  }, [step, next])

  useEffect(() => {
    if (!steps) return

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null

      // Leave arrow keys alone while the user is typing somewhere.
      if (e.key !== 'Escape' && (el?.isContentEditable || el?.closest('input, textarea, select'))) return
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight' && !interactive) next()
      else if (e.key === 'ArrowLeft') back()
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [steps, next, back, close, interactive])

  if (!page) return null

  const card = step && (
    <Paper
      ref={cardRef}
      role='dialog'
      aria-labelledby='tour-title'
      aria-describedby='tour-body'
      tabIndex={-1}
      data-tour-card
      data-tour-step={index}
      data-tour-total={steps!.length}
      data-help-index={current?.n}
      data-wait-for={interactive ? step.waitFor : undefined}
      data-tour-target={interactive ? step.target : undefined}
      elevation={8}
      sx={{ p: 4, maxInlineSize: 340, outline: 'none' }}
    >
      <Typography variant='caption' color='text.secondary'>
        {index + 1} / {steps!.length}
      </Typography>
      <Typography id='tour-title' variant='h6' sx={{ mb: 1 }}>
        {step.title}
      </Typography>
      <Typography id='tour-body' variant='body2' color='text.secondary' sx={{ mb: 4 }}>
        {step.body}
      </Typography>
      {interactive && (
        <Typography variant='caption' color='primary' sx={{ display: 'block', mt: -3, mb: 4 }}>
          {step.waitFor === 'click' ? 'ลองกดที่จุดที่ไฮไลต์เพื่อไปต่อ' : 'ลองกรอกข้อมูลในช่องที่ไฮไลต์เพื่อไปต่อ'}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button size='small' color='secondary' onClick={close} data-tour-close sx={{ marginInlineEnd: 'auto' }}>
          ข้าม
        </Button>
        {index > 0 && (
          <Button size='small' variant='outlined' onClick={back}>
            ย้อนกลับ
          </Button>
        )}
        {!interactive && (
          <Button size='small' variant='contained' onClick={next} data-tour-next>
            {last ? 'เสร็จสิ้น' : 'ถัดไป'}
          </Button>
        )}
      </Box>
    </Paper>
  )

  return (
    <>
      <Tooltip title='สอนใช้งานหน้านี้'>
        <IconButton ref={buttonRef} onClick={start} aria-label='สอนใช้งานหน้านี้' data-tour='tour' className='text-textPrimary'>
          <i className='ri-question-line' />
        </IconButton>
      </Tooltip>

      {/* Portal to <body>: inside the sticky header, zIndex would be scoped below the sidebar. */}
      {step && (
        <Portal>
          {/* Spotlight: dims everything except the target. Purely visual — the page stays usable. */}
          <Box
            aria-hidden
            sx={{
              position: 'fixed',
              zIndex: 'modal',
              pointerEvents: 'none',
              borderRadius: 1,
              transition: 'all var(--motion-fast, 150ms) ease-out',
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
              ...(rect
                ? {
                    insetBlockStart: rect.top - 6,
                    insetInlineStart: rect.left - 6,
                    inlineSize: rect.width + 12,
                    blockSize: rect.height + 12,
                    boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.55)',
                    outline: '2px solid var(--mui-palette-primary-main)'
                  }
                : { inset: 0, bgcolor: 'rgb(0 0 0 / 0.55)' })
            }}
          />
          {/* Interactive steps only: catch clicks everywhere except the target (evenodd hole). */}
          {interactive && rect && (
            <Box
              aria-hidden
              sx={{
                position: 'fixed',
                inset: 0,
                zIndex: 'modal',
                clipPath: `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${rect.left}px ${rect.top}px, ${rect.right}px ${rect.top}px, ${rect.right}px ${rect.bottom}px, ${rect.left}px ${rect.bottom}px, ${rect.left}px ${rect.top}px)`
              }}
            />
          )}
          {anchor && rect ? (
            <Popper
              open
              anchorEl={anchor}
              placement='auto'
              modifiers={[{ name: 'offset', options: { offset: [0, 14] } }, { name: 'preventOverflow', options: { padding: 12 } }]}
              sx={{ zIndex: 'tooltip' }}
            >
              {card}
            </Popper>
          ) : (
            <Box sx={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', zIndex: 'tooltip', pointerEvents: 'none' }}>
              <Box sx={{ pointerEvents: 'auto' }}>{card}</Box>
            </Box>
          )}
        </Portal>
      )}
    </>
  )
}

export default PageTour
