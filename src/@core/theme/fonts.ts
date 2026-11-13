/*
 * Project font — Mornamchi (Thai + Latin) for body text and headings alike.
 *
 * Self-hosted from src/assets/fonts/mornamchi via `next/font/local` (no network needed at build).
 * Weights available: 300 Light, 400 Regular, 700 Bold — other weights (500/600/800) are
 * rounded by the browser to the nearest one.
 * To change the font, swap the loader below and keep the exported family strings —
 * everything else (theme, layout) reads from these.
 */

// Next Imports
import localFont from 'next/font/local'

export const mainFont = localFont({
  src: [
    { path: '../../assets/fonts/mornamchi/Mornamchi-Light.woff2', weight: '300', style: 'normal' },
    { path: '../../assets/fonts/mornamchi/Mornamchi-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../assets/fonts/mornamchi/Mornamchi-Bold.woff2', weight: '700', style: 'normal' }
  ],
  variable: '--font-main',
  display: 'swap',
  fallback: ['sans-serif']
})

// Font-family stacks consumed by the MUI theme (see `@core/theme`).
export const bodyFontFamily = `var(--font-main), 'Mornamchi', sans-serif`
export const headingFontFamily = bodyFontFamily

// CSS-variable className to attach to <body> so the @font-face rules load.
export const fontVariables = mainFont.variable
