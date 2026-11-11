/*
 * Project fonts — mirrors the MSU-BEPS reference design.
 *
 *  - Body / UI text .......... Sarabun            (Thai + Latin, very readable)
 *  - Headings & numbers ...... Manrope            (Latin display) → falls back to
 *                              IBM Plex Sans Thai (Thai display)
 *
 * Self-hosted via `next/font/google` (no external <link> needed).
 * To change a font, swap the import + loader below and keep the exported
 * family strings — everything else (theme, layout) reads from these.
 */

// Next Imports
import { Sarabun, IBM_Plex_Sans_Thai, Manrope } from 'next/font/google'

export const bodyFont = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
  fallback: ['sans-serif']
})

// Manrope is a variable font → omit `weight` to load the full range.
export const headingLatinFont = Manrope({
  subsets: ['latin'],
  variable: '--font-heading-latin',
  display: 'swap',
  fallback: ['sans-serif']
})

export const headingThaiFont = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading-thai',
  display: 'swap',
  fallback: ['sans-serif']
})

// Font-family stacks consumed by the MUI theme (see `@core/theme`).
export const bodyFontFamily = `var(--font-body), 'Sarabun', sans-serif`
export const headingFontFamily = `var(--font-heading-latin), var(--font-heading-thai), 'Manrope', 'IBM Plex Sans Thai', sans-serif`

// CSS-variable classNames to attach to <body> so the @font-face rules load.
export const fontVariables = `${bodyFont.variable} ${headingLatinFont.variable} ${headingThaiFont.variable}`
