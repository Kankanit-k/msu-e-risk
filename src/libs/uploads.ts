// File storage for POST /api/files and GET /api/files/[id].
// Each upload is two files under UPLOAD_DIR: <id> (the bytes) and <id>.json (owner, name, type).
// Ids are 128-bit random hex, so a path can never be built from user input.
import 'server-only'

import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads'))

const mb = Number(process.env.UPLOAD_MAX_MB)

export const UPLOAD_MAX_BYTES = Math.floor((Number.isFinite(mb) && mb > 0 ? mb : 10) * 1024 * 1024)

export type UploadMeta = { id: string; owner: string; name: string; type: string; size: number; createdAt: string }

const ID = /^[a-f0-9]{32}$/

const startsWith = (buf: Buffer, bytes: number[], offset = 0) => bytes.every((b, i) => buf[offset + i] === b)

// Allowlist: extension → MIME type + a magic-byte check. The extension must match the content.
const ZIP = [0x50, 0x4b, 0x03, 0x04]

const ALLOWED: Record<string, { type: string; match: (b: Buffer) => boolean }> = {
  pdf: { type: 'application/pdf', match: b => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]) },
  png: { type: 'image/png', match: b => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  jpg: { type: 'image/jpeg', match: b => startsWith(b, [0xff, 0xd8, 0xff]) },
  jpeg: { type: 'image/jpeg', match: b => startsWith(b, [0xff, 0xd8, 0xff]) },
  webp: {
    type: 'image/webp',
    match: b => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)
  },
  docx: {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    match: b => startsWith(b, ZIP)
  },
  xlsx: { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', match: b => startsWith(b, ZIP) }
}

export const UPLOAD_ACCEPT = Object.keys(ALLOWED)
  .map(e => `.${e}`)
  .join(',')

/** Keep a display name only: no path, no control characters, bounded length. */
export const cleanName = (name: string) =>
  (name.split(/[\\/]/).pop() ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f"]/g, '')
    .trim()
    .slice(0, 150) || 'file'

/** Returns the allowed MIME type, or null if the extension is not allowed or the bytes disagree. */
export const detectType = (name: string, head: Buffer) => {
  const rule = ALLOWED[path.extname(name).slice(1).toLowerCase()]

  return rule && rule.match(head) ? rule.type : null
}

export const saveUpload = async (owner: string, name: string, type: string, data: Buffer): Promise<UploadMeta> => {
  const meta: UploadMeta = {
    id: randomBytes(16).toString('hex'),
    owner,
    name,
    type,
    size: data.length,
    createdAt: new Date().toISOString()
  }

  await mkdir(UPLOAD_DIR, { recursive: true, mode: 0o700 })
  await writeFile(path.join(UPLOAD_DIR, meta.id), data, { mode: 0o600, flag: 'wx' })
  await writeFile(path.join(UPLOAD_DIR, `${meta.id}.json`), JSON.stringify(meta), { mode: 0o600, flag: 'wx' })

  return meta
}

/** Metadata + absolute path for a stored upload, or null for a malformed or unknown id. */
export const findUpload = async (id: string) => {
  if (!ID.test(id)) return null

  const meta = await readFile(path.join(UPLOAD_DIR, `${id}.json`), 'utf8')
    .then(s => JSON.parse(s) as UploadMeta)
    .catch(() => null)

  return meta ? { meta, file: path.join(UPLOAD_DIR, id) } : null
}
