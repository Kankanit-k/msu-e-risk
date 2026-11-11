// Record the tour of every page in src/data/help as an MP4 with Thai narration and subtitles.
// Needs ffmpeg on PATH and a running server. Run: pnpm manual:video
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { gotoPage, helpByPage, manualSlug, openBrowser, tourSteps } from './session.mjs'
import { provider, speak } from './tts.mjs'

const OUT = path.join(process.cwd(), 'public', 'manual', 'video')
const LEAD = 0.6 // seconds of video kept before the first step
const GAP = 0.5 // pause after each narration before moving on

const vttTime = s => new Date(Math.max(0, s) * 1000).toISOString().slice(11, 23)

const ffmpeg = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })

await mkdir(OUT, { recursive: true })
const work = await mkdtemp(path.join(tmpdir(), 'manual-video-'))

console.log(`narration: ${provider}`)

try {
  for (const [route, help] of Object.entries(helpByPage)) {
    const slug = manualSlug(route)

    // 1. Narrate first, so the recording can wait exactly as long as each line takes.
    const audio = await Promise.all(
      help.steps.map(async (s, n) => {
        const file = path.join(work, slug, `${n + 1}.mp3`)

        return { file, seconds: await speak(`${s.title}. ${s.body}`, file) }
      })
    )

    // 2. Record the real tour at that pace. The video clock starts when the page is created.
    const recDir = path.join(work, slug, 'rec')
    const { browser, context } = await openBrowser({ video: recDir })
    const cues = []

    try {
      const page = await context.newPage()
      const t0 = Date.now()

      await gotoPage(page, route)

      for await (const n of tourSteps(page)) {
        const at = (Date.now() - t0) / 1000
        const hold = Math.max(audio[n].seconds, 2.5) + GAP

        cues.push({ n, at, end: at + hold })
        await page.waitForTimeout(hold * 1000)
      }

      await page.waitForTimeout(800)
    } finally {
      await context.close() // flushes the .webm
      await browser.close()
    }

    const webm = path.join(recDir, (await readdir(recDir)).find(f => f.endsWith('.webm')))
    const start = Math.max(0, cues[0].at - LEAD)

    // 3. Subtitles (VTT for the web player; also muxed into the MP4 as a soft track).
    const vtt = path.join(OUT, `${slug}.vtt`)

    await writeFile(
      vtt,
      'WEBVTT\n\n' +
        cues
          .map(({ n, at, end }, i) => `${i + 1}\n${vttTime(at - start)} --> ${vttTime(end - start)}\n${help.steps[n].title} — ${help.steps[n].body}\n`)
          .join('\n')
    )

    // 4. Mux: trim the page-load lead-in, place each narration at its step, encode H.264/AAC.
    const voiced = provider === 'none' ? [] : cues
    const inputs = ['-ss', String(start), '-i', webm, ...voiced.flatMap(c => ['-i', audio[c.n].file]), '-i', vtt]
    const subIndex = voiced.length + 1

    const filter = voiced.length
      ? voiced.map((c, i) => `[${i + 1}:a]adelay=${Math.round((c.at - start) * 1000)}:all=1[a${i}]`).join(';') +
        `;${voiced.map((_, i) => `[a${i}]`).join('')}amix=inputs=${voiced.length}:normalize=0[aout]`
      : null

    ffmpeg([
      ...inputs,
      ...(filter ? ['-filter_complex', filter, '-map', '0:v', '-map', '[aout]'] : ['-map', '0:v']),
      '-map', `${subIndex}:s`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
      ...(filter ? ['-c:a', 'aac', '-b:a', '128k'] : []),
      '-c:s', 'mov_text', '-metadata:s:s:0', 'language=tha',
      '-shortest', '-movflags', '+faststart',
      path.join(OUT, `${slug}.mp4`)
    ])

    console.log(`${route}: ${cues.length} steps → data/manual/video/${slug}.mp4`)
  }
} finally {
  await rm(work, { recursive: true, force: true })
}
