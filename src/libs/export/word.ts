// Word export without a dependency: Word opens an HTML document saved as .doc (tables, Thai text, landscape).
export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Plain text → HTML with line breaks kept. */
export const textToHtml = (s: string) => escapeHtml(s).replace(/\r?\n/g, '<br>')

const page = (body: string, landscape: boolean) => `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>
@page Section1 { size: ${landscape ? '841.9pt 595.3pt; mso-page-orientation: landscape' : '595.3pt 841.9pt'}; margin: 36pt; }
div.Section1 { page: Section1; }
body { font-family: 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 14pt; }
h1 { font-size: 18pt; margin: 0 0 6pt; }
p.meta { margin: 0; }
table { border-collapse: collapse; width: 100%; margin-top: 10pt; }
th, td { border: 1px solid #000; padding: 4pt 6pt; vertical-align: top; }
th { background: #e8e8e8; }
</style></head><body><div class="Section1">${body}</div></body></html>`

/** Download `bodyHtml` as `<filename>.doc`. Escape any user text with escapeHtml/textToHtml first. */
export const downloadWord = (filename: string, bodyHtml: string, { landscape = false } = {}) => {
  const blob = new Blob(['﻿', page(bodyHtml, landscape)], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  a.href = url
  a.download = `${filename.replace(/[\\/:*?"<>|]+/g, ' ').trim()}.doc`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
