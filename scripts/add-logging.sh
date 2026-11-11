#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# ติดตั้งระบบ logging (ไฟล์รายวัน + Discord webhook) ลงโปรเจกต์ที่สร้างจาก
# template นี้ไปก่อนหน้าแล้ว
#
#   ใช้ที่ "โปรเจกต์ปลายทาง":
#     bash scripts/add-logging.sh /path/to/old-project
#   หรือรันจากในโปรเจกต์ปลายทางโดยดึงไฟล์จาก template ที่ clone ไว้:
#     bash /path/to/mui-template/scripts/add-logging.sh .
#
# สคริปต์นี้ "คัดลอกไฟล์ใหม่" ให้เท่านั้น ส่วนไฟล์ที่ต้องแก้เพิ่ม (layout, env,
# .gitignore, accessControl) จะพิมพ์เป็น checklist ไว้ท้ายสุด เพราะแต่ละโปรเจกต์
# แก้ไฟล์พวกนี้ไปคนละแบบ — ไม่ควรเขียนทับอัตโนมัติ
# ---------------------------------------------------------------------------
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:-}"

if [[ -z "$DEST" ]]; then
  echo "usage: bash scripts/add-logging.sh <path-to-target-project>" >&2
  exit 1
fi

DEST="$(cd "$DEST" && pwd)"

if [[ "$SRC" == "$DEST" ]]; then
  echo "ต้นทางกับปลายทางเป็นโฟลเดอร์เดียวกัน — ไม่มีอะไรต้องทำ" >&2
  exit 1
fi

if [[ ! -f "$DEST/package.json" ]]; then
  echo "ไม่พบ package.json ที่ $DEST — ชี้ path ให้ถูกก่อน" >&2
  exit 1
fi

FILES=(
  "src/libs/logger/types.ts"
  "src/libs/logger/config.ts"
  "src/libs/logger/serialize.ts"
  "src/libs/logger/fileTransport.ts"
  "src/libs/logger/discordTransport.ts"
  "src/libs/logger/index.ts"
  "src/libs/logger/client.ts"
  "src/libs/logger/withLogging.ts"
  "src/instrumentation.ts"
  "src/components/ErrorReporter.tsx"
  "src/app/api/log/route.ts"
  "src/app/error.tsx"
  "src/app/global-error.tsx"
  "docs/logging.md"
  "docs/logging-retrofit.md"
  ".claude/skills/logging/SKILL.md"
)

skipped=()

for file in "${FILES[@]}"; do
  if [[ -f "$DEST/$file" ]]; then
    skipped+=("$file")
    continue
  fi

  mkdir -p "$DEST/$(dirname "$file")"
  cp "$SRC/$file" "$DEST/$file"
  echo "  + $file"
done

if [[ ${#skipped[@]} -gt 0 ]]; then
  echo
  echo "ข้ามไฟล์ที่มีอยู่แล้ว (ไปรวมเองด้วยมือ — diff กับ $SRC ได้):"
  printf '    ~ %s\n' "${skipped[@]}"
fi

cat <<'CHECKLIST'

────────────────────────────────────────────────────────────────────────────
เหลืออีก 5 อย่างที่ต้องแก้เอง (ดูรายละเอียด + โค้ดเต็มใน docs/logging-retrofit.md)

  1. src/app/layout.tsx        เพิ่ม <ErrorReporter /> ไว้บนสุดใน <body>
  2. .env.local / .env.production   คัดลอกบล็อก LOG_* และ DISCORD_WEBHOOK_* จาก .env.example
  3. .gitignore                เพิ่ม /logs
  4. src/configs/accessControl.ts   เพิ่ม '/api/log' ใน publicRoutes
                               (ถ้าโปรเจกต์ไม่มีไฟล์นี้ ให้ยกเว้น /api/log ใน middleware matcher แทน)
  5. package.json              ต้องมี "server-only" ใน dependencies → pnpm add server-only

จากนั้น: pnpm lint && pnpm build แล้วทดสอบด้วย
  curl -X POST http://localhost:3000/api/log/ -H 'Content-Type: application/json' \
       -d '{"level":"error","message":"ทดสอบ Discord alert"}'
  (ถ้าโปรเจกต์มี basePath ให้ใส่ basePath นำหน้า /api/log ด้วย)
────────────────────────────────────────────────────────────────────────────
CHECKLIST
