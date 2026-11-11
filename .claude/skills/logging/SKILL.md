---
name: logging
description: Log anything, report an error, or send an alert to Discord in this template. Use when adding error handling, try/catch, logging, a Discord webhook alert, an API route, or when debugging why an error did or did not reach the log file / Discord channel.
---

# Logging & error alerts (MSU starter kit)

Everything is already wired. **โดยปกติคุณไม่ต้องเขียนอะไรเพิ่มเลยเพื่อให้ error ไปถึง Discord** —
error ที่หลุดขึ้นมา (throw) จะถูกจับอัตโนมัติ เขียนลงไฟล์รายวัน และส่งเข้า webhook ให้เอง

- โค้ด: `src/libs/logger/`
- ไฟล์: `logs/app-YYYY-MM-DD.log` (ทุก level) + `logs/error-YYYY-MM-DD.log` (เฉพาะ error/fatal)
- Discord: อ่านจาก `DISCORD_WEBHOOK_URL` — ไม่ได้ตั้งค่า = เขียนไฟล์อย่างเดียว ไม่พัง
- คู่มือฉบับเต็ม: [`docs/logging.md`](../../../docs/logging.md)
- ติดตั้งย้อนหลังในโปรเจกต์ที่สร้างจาก template ก่อนหน้านี้:
  [`docs/logging-retrofit.md`](../../../docs/logging-retrofit.md) หรือ `bash scripts/add-logging.sh <target>`

## กฎข้อเดียวที่ต้องจำ: อย่ากลืน error

```ts
// ❌ error หายไปเลย ไม่มีใครรู้ ไม่มี log ไม่มี Discord
try {
  await save(data)
} catch {
  return null
}

// ✅ ปล่อยให้ throw — instrumentation จับให้เอง
await save(data)

// ✅ ถ้าจำเป็นต้อง catch (เช่นต้องคืน fallback ให้ผู้ใช้) → log ก่อนเสมอ
try {
  await save(data)
} catch (error) {
  logger.error('บันทึกข้อมูลไม่สำเร็จ', { error, context: { userId } })

  return null
}
```

`catch {}` เปล่า ๆ หรือ `catch (e) { console.error(e) }` คือบั๊กในโปรเจกต์นี้ —
`console.error` ไม่ลงไฟล์และไม่เข้า Discord

## ต้องทำอะไรบ้าง — ดูตามสถานการณ์

| สถานการณ์ | ต้องเขียน try/catch ไหม | ต้องทำอะไร |
| :-- | :-- | :-- |
| Server Component / page throw | **ไม่ต้อง** | อัตโนมัติ (`onRequestError` ใน `src/instrumentation.ts`) |
| Server Action throw | **ไม่ต้อง** | อัตโนมัติ |
| Route handler throw | **ไม่ต้อง** | อัตโนมัติ — แต่ควรห่อ `withLogging` เพื่อได้ requestId + timing |
| Client component render พัง | **ไม่ต้อง** | อัตโนมัติ (`src/app/error.tsx` → `POST /api/log`) |
| `window.onerror` / promise rejection ในเบราว์เซอร์ | **ไม่ต้อง** | อัตโนมัติ (`<ErrorReporter />` ใน root layout) |
| `uncaughtException` / `unhandledRejection` ของ process | **ไม่ต้อง** | อัตโนมัติ (`register()` ใน `src/instrumentation.ts`) |
| จับ error เองเพื่อคืน fallback / ตอบ 4xx | **ต้อง** | `logger.error(msg, { error, context })` ก่อน return |
| ปุ่ม/ฟอร์มฝั่ง client ทำงานไม่สำเร็จ | **ต้อง** | `clientLogger.error(msg, { error, context })` |
| เหตุการณ์สำคัญที่ไม่ใช่ error (สร้าง/ลบข้อมูล, ล็อกอิน) | — | `logger.info(msg, { context })` |
| middleware (`src/middleware.ts`) | — | รันบน **edge runtime** → เขียนไฟล์ไม่ได้ ห้าม import logger |

## API ที่ใช้ได้ (เลือกให้ถูกฝั่ง)

### 1. ฝั่ง server — `logger`

ใช้ใน server component, server action, route handler, `src/libs/**` ที่รันบน server

```ts
// Logger Imports
import { logger } from '@/libs/logger'

logger.debug('รายละเอียดตอน dev')
logger.info('สร้างผู้ใช้ใหม่', { context: { userId } })
logger.warn('ข้อมูลไม่ครบ ใช้ค่า default แทน', { context: { field: 'faculty' } })
logger.error('บันทึกไม่สำเร็จ', { error, context: { userId } })   // → Discord
logger.fatal('ต่อฐานข้อมูลไม่ได้', { error })                      // → Discord + mention
```

ตัวเลือกใน argument ที่สอง: `{ error, context, source, requestId, silent }`
(`silent: true` = ลงไฟล์แต่ไม่กวน Discord)

ผูก context ติดไปทุกบรรทัดด้วย `logger.child({ context: { module: 'users' } })`

> `@/libs/logger` เป็น `server-only` — import ใน `'use client'` แล้ว build พัง

### 2. ใน API route — `withLogging` (แนะนำให้ใช้ทุก route ใหม่)

ได้ log เริ่ม/จบ + เวลาที่ใช้ + `x-request-id` + จับ error แล้วตอบ 500 ให้อัตโนมัติ

```ts
// Next Imports
import { NextResponse } from 'next/server'

// Logger Imports
import { withLogging } from '@/libs/logger/withLogging'

export const GET = withLogging(async (req, { log }) => {
  log.info('กำลังดึงรายชื่อผู้ใช้')

  return NextResponse.json(await getUsers())
})
```

### 3. ฝั่ง client — `clientLogger`

```ts
'use client'

// Logger Imports
import { clientLogger } from '@/libs/logger/client'

clientLogger.error('บันทึกฟอร์มไม่สำเร็จ', { error, context: { formId } })
```

ภายในมันยิง `POST /api/log` ด้วย `sendBeacon` (fallback เป็น `fetch keepalive`)
แล้วฝั่ง server ค่อยเขียนไฟล์ + ส่ง Discord ต่อ

### 4. Endpoint สำหรับระบบอื่น / non-React — `POST /api/log`

เป็น public route (อยู่ใน `publicRoutes`) เพราะต้องรายงาน error บนหน้า login ได้ด้วย
จำกัด 60 ครั้ง/นาที/IP

```
POST {basePath}/api/log        # basePath ปัจจุบันคือ /digitalplan → /digitalplan/api/log/
Content-Type: application/json

{
  "level": "error",                       // debug|info|warn|error|fatal (default: error)
  "source": "client",                     // client|server|api|auth|react|... (default: client)
  "message": "ข้อความสั้น ๆ",
  "error":   { "name": "TypeError", "message": "...", "stack": "..." },
  "context": { "userId": 1234 }           // อะไรก็ได้ที่เป็น JSON
}
```

ตอบ `{ "ok": true }` เสมอเมื่อรับไว้แล้ว (429 เมื่อยิงถี่เกิน)

ทดสอบเร็ว ๆ:

```bash
curl -X POST http://localhost:3000/digitalplan/api/log/ \
  -H 'Content-Type: application/json' \
  -d '{"level":"error","message":"ทดสอบ Discord alert"}'

tail -n 1 logs/app-$(date +%F).log | jq .
```

## ข้อควรรู้เวลาต่อยอด

- **อย่าใส่ข้อมูลอ่อนไหวลง message** — ใส่ใน `context` แทน แล้ว key อย่าง `password`, `token`,
  `secret`, `cookie`, `authorization` จะถูก `[redacted]` ให้อัตโนมัติ
  (เพิ่ม key ได้ที่ `redactedKeys` ใน `src/libs/logger/config.ts`)
- **error ซ้ำ ๆ ไม่สแปม Discord** — กันซ้ำ 60 วิ และจำกัด 20 ข้อความ/นาที (ไฟล์ยังบันทึกครบทุกครั้ง)
- **ระดับที่ส่ง Discord** ปรับได้ที่ `DISCORD_WEBHOOK_LEVEL` (ค่าเริ่มต้น `error`)
- **webhook อยู่ใน forum channel** → ต้องตั้ง `DISCORD_WEBHOOK_FORUM=true` ไม่งั้น Discord ตอบ 400
  (`must have a thread_name or thread_id`) โหมดนี้จะเปิดโพสต์ใหม่ต่อ error หนึ่งชนิด แล้ว error เดิม
  ตอบกลับเข้าโพสต์เดิม; ถ้าอยากให้ทุก alert ไปกองในโพสต์เดียวให้ตั้ง `DISCORD_WEBHOOK_THREAD_ID`
  รายละเอียดอยู่ใน `docs/logging.md` หัวข้อ 1 — **อย่าไปแก้ URL หรือประกอบ query param เอง**
- **logging ต้องไม่ทำให้แอปพัง** — ถ้าเขียนไฟล์ไม่ได้หรือ webhook ล่ม ระบบจะเงียบ ๆ ไปต่อ
  ห้ามเขียนโค้ดที่ `await` การส่ง Discord แล้วปล่อยให้ error ทะลุออกมา
- **เพิ่ม transport ใหม่** (เช่น LINE Notify, Sentry) → ทำเป็นไฟล์ใหม่ใน `src/libs/logger/`
  แล้วเรียกใน `emit()` ที่ `src/libs/logger/index.ts` แบบ fire-and-forget เหมือน `sendToDiscord`
