// Minimal .xlsx writer — no dependency. Builds one worksheet with inline strings (UTF-8, so Thai
// text is stored as-is) inside a ZIP using the "stored" (uncompressed) method. Enough for exporting
// a table; for formulas, styling or multiple sheets use a real library (e.g. exceljs) instead.

export type XlsxColumn<T> = {
  label: string

  /** Cell value. Numbers stay numeric in Excel; everything else is written as text. */
  value: (row: T) => string | number | null | undefined
  width?: number
}

const enc = new TextEncoder()

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

    // Control characters are invalid in XML 1.0 and make Excel refuse the file.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')

const colName = (i: number) => {
  let n = i + 1
  let s = ''

  while (n > 0) {
    const r = (n - 1) % 26

    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }

  return s
}

const cell = (ref: string, v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`

  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`
}

const sheetXml = <T>(rows: T[], columns: XlsxColumn<T>[]) => {
  const cols = columns
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width ?? 20}" customWidth="1"/>`)
    .join('')

  const header = `<row r="1">${columns.map((c, i) => cell(`${colName(i)}1`, c.label)).join('')}</row>`

  const body = rows
    .map(
      (row, r) =>
        `<row r="${r + 2}">${columns.map((c, i) => cell(`${colName(i)}${r + 2}`, c.value(row))).join('')}</row>`
    )
    .join('')

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${cols}</cols><sheetData>${header}${body}</sheetData></worksheet>`
  )
}

const files = (sheet: string, sheetName: string): [string, string][] => [
  [
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
  ],
  [
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
  ],
  [
    'xl/workbook.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<sheets><sheet name="${esc(sheetName.slice(0, 31).replace(/[\\/?*[\]:]/g, ' '))}" sheetId="1" r:id="rId1"/></sheets></workbook>`
  ],
  [
    'xl/_rels/workbook.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
  ],
  ['xl/worksheets/sheet1.xml', sheet]
]

// --- ZIP (stored, no compression) -----------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)

  for (let n = 0; n < 256; n++) {
    let c = n

    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }

  return t
})()

const crc32 = (data: Uint8Array) => {
  let c = 0xffffffff

  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)

  return (c ^ 0xffffffff) >>> 0
}

export const zipStored = (entries: [string, string][]): Uint8Array => {
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const [name, text] of entries) {
    const nameBytes = enc.encode(name)
    const data = enc.encode(text)
    const crc = crc32(data)
    const local = new DataView(new ArrayBuffer(30))

    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true) // version needed
    local.setUint16(6, 0x0800, true) // UTF-8 names
    local.setUint16(8, 0, true) // stored
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, nameBytes.length, true)

    const cen = new DataView(new ArrayBuffer(46))

    cen.setUint32(0, 0x02014b50, true)
    cen.setUint16(4, 20, true)
    cen.setUint16(6, 20, true)
    cen.setUint16(8, 0x0800, true)
    cen.setUint32(16, crc, true)
    cen.setUint32(20, data.length, true)
    cen.setUint32(24, data.length, true)
    cen.setUint16(28, nameBytes.length, true)
    cen.setUint32(42, offset, true)

    chunks.push(new Uint8Array(local.buffer), nameBytes, data)
    central.push(new Uint8Array(cen.buffer), nameBytes)
    offset += 30 + nameBytes.length + data.length
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0)
  const end = new DataView(new ArrayBuffer(22))

  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, entries.length, true)
  end.setUint16(10, entries.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  const all = [...chunks, ...central, new Uint8Array(end.buffer)]
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0))
  let p = 0

  for (const c of all) {
    out.set(c, p)
    p += c.length
  }

  return out
}

/** Build the .xlsx bytes (usable on the server too). */
export const buildXLSX = <T>(rows: T[], columns: XlsxColumn<T>[], sheetName = 'Sheet1') =>
  zipStored(files(sheetXml(rows, columns), sheetName))

/** Build and download an .xlsx in the browser. */
export const downloadXLSX = <T>(rows: T[], columns: XlsxColumn<T>[], filename: string) => {
  const name = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  const bytes = buildXLSX(rows, columns, name.replace(/\.xlsx$/, ''))

  const blob = new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
