// Screenshot every tour step of every page in src/data/help, then save /manual as a PDF.
// Run (server must be running): pnpm manual:capture
import { mkdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'

import { BASE, gotoPage, helpByPage, manualSlug, openBrowser, tourSteps } from './session.mjs'

const OUT = path.resolve(process.env.MANUAL_DIR || path.join(process.cwd(), 'data', 'manual'))
const { browser, context } = await openBrowser()
let shots = 0

try {
  const page = await context.newPage()

  for (const [route, help] of Object.entries(helpByPage)) {
    const dir = path.join(OUT, manualSlug(route))

    await gotoPage(page, route) // fails on a bad session before any old screenshots are removed
    await rm(dir, { recursive: true, force: true })
    await mkdir(dir, { recursive: true })

    let taken = 0

    for await (const n of tourSteps(page)) {
      await page.screenshot({ path: path.join(dir, `${n + 1}.png`) })
      taken++
    }

    shots += taken
    console.log(`${route}: ${taken}/${help.steps.length} steps${taken < help.steps.length ? ' (missing targets skipped)' : ''}`)
  }

  // PDF of the manual page itself, so it always matches /manual.
  await gotoPage(page, '/manual')
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll('img')) img.loading = 'eager'
    await Promise.all([...document.images].map(img => img.decode().catch(() => {})))
  })
  await page.emulateMedia({ media: 'print' })
  await page.pdf({
    path: path.join(OUT, 'manual.pdf'),
    format: 'A4',
    printBackground: true,
    margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' }
  })

  console.log(`\n${shots} screenshots + manual.pdf (${Math.round((await stat(path.join(OUT, 'manual.pdf'))).size / 1024)} KB) → data/manual/  [${BASE}]`)
} finally {
  await browser.close()
}
