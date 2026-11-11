import { existsSync, statSync } from 'node:fs'
import path from 'node:path'

import type { Metadata } from 'next'

import { helpByPage, manualSlug } from '@/data/help'
import { MANUAL_DIR } from '@/libs/manualFiles'
import Manual from '@views/manual/Manual'
import type { ManualPage } from '@views/manual/Manual'

export const metadata: Metadata = { title: 'คู่มือการใช้งาน' }

// Generated files are read at request time, so re-running `pnpm manual:capture` needs no rebuild.
export const dynamic = 'force-dynamic'

const basePath = process.env.NEXT_PUBLIC_BASEPATH?.startsWith('/') ? process.env.NEXT_PUBLIC_BASEPATH : ''

// URL of a generated file if it exists, with its mtime as a cache-buster. Served behind login by /api/manual.
const asset = (rel: string) => {
  const file = path.join(MANUAL_DIR, rel)

  return existsSync(file) ? `${basePath}/api/manual/${rel}?v=${Math.round(statSync(file).mtimeMs)}` : null
}

const ManualRoute = () => {
  const pages: ManualPage[] = Object.entries(helpByPage).map(([route, help]) => {
    const slug = manualSlug(route)

    return {
      route,
      slug,
      ...help,
      video: asset(`video/${slug}.mp4`),
      captions: asset(`video/${slug}.vtt`),
      shots: help.steps.map((_, i) => asset(`${slug}/${i + 1}.png`))
    }
  })

  return <Manual pages={pages} pdf={asset('manual.pdf')} />
}

export default ManualRoute
