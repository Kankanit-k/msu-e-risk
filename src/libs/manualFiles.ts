// Where scripts/manual writes the generated manual (gitignored via /data/*), served by /api/manual/*.
import path from 'node:path'

export const MANUAL_DIR = path.resolve(process.env.MANUAL_DIR || path.join(process.cwd(), 'data', 'manual'))
