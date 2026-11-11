# Logging & Discord error alerts

ระบบบันทึก log ทั้งหมดอยู่ที่ `src/libs/logger` — เขียนเป็น **ไฟล์วันละ 1 ไฟล์** และส่ง
**error ทุกอย่างเข้า Discord webhook** โดยอัตโนมัติ

## 1. ใส่ webhook (สิ่งเดียวที่ต้องทำเพิ่ม)

```env
# .env.local / .env.production
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy
```

ยังไม่ใส่ก็ใช้งานได้ปกติ — ระบบจะเขียนไฟล์อย่างเดียวแล้วข้ามการแจ้งเตือนไป

### ถ้า webhook อยู่ใน forum channel

Discord **บังคับ** ว่าข้อความที่ยิงเข้า forum channel ต้องอยู่ในโพสต์ (thread) เสมอ
ถ้ายิงเปล่า ๆ จะได้ `400 — Webhooks posted to forum channels must have a thread_name or thread_id`
เปิดโหมดฟอรั่มด้วยบรรทัดเดียว:

```env
DISCORD_WEBHOOK_FORUM=true
```

พฤติกรรมที่ได้:

- error **ชนิดใหม่** → เปิดโพสต์ใหม่ ตั้งชื่อเป็น `❌ [production] TypeError: ข้อความ error`
- error **ชนิดเดิม** → ตอบกลับเข้าโพสต์เดิมที่เคยเปิดไว้ (ระบบจำ thread id ของแต่ละ error ไว้ในหน่วยความจำ)
  ทำให้ห้องไม่รก และไล่ดูประวัติของ error ตัวหนึ่งได้ในโพสต์เดียว
- โพสต์ถูกลบไปแล้ว (404) → ระบบลืม thread นั้นแล้วเปิดโพสต์ใหม่ให้เอง
- ติด tag ให้โพสต์ที่เปิดใหม่ได้ด้วย `DISCORD_WEBHOOK_TAG_IDS=<tagId>,<tagId>`

ตัวเลือกเพิ่มเติม — อยากให้ **ทุก** alert ไปกองอยู่ในโพสต์/เธรดเดียวที่เตรียมไว้เอง
(ใช้ได้ทั้ง forum และ text channel ที่มีเธรด): คลิกขวาที่โพสต์ → Copy Link → เอาตัวเลขชุดท้าย

```env
DISCORD_WEBHOOK_THREAD_ID=1542040535982809120
```

`THREAD_ID` มีความสำคัญเหนือ `FORUM` — ตั้งแล้วจะไม่มีการเปิดโพสต์ใหม่เลย

> หมายเหตุ: การจำ thread เป็นแบบ per-process ถ้ารันหลาย instance แต่ละตัวจะเปิดโพสต์ของตัวเอง
> ครั้งแรก อยากให้รวมเป็นโพสต์เดียวจริง ๆ ให้ใช้ `DISCORD_WEBHOOK_THREAD_ID`

## 2. ไฟล์ log

```
logs/
  app-2026-08-26.log      ทุก level ของวันนั้น
  error-2026-08-26.log    เฉพาะ error / fatal (ไว้ไล่ปัญหาเร็ว ๆ)
```

- หนึ่งบรรทัด = หนึ่ง entry เป็น JSON (NDJSON) → `grep`, `jq` ได้ทันที
- วันเปลี่ยน (ตาม `LOG_TIMEZONE`, ค่าเริ่มต้น `Asia/Bangkok`) ระบบสร้างไฟล์ใหม่เอง
- ไฟล์เก่ากว่า `LOG_RETENTION_DAYS` (30 วัน) ถูกลบอัตโนมัติ
- `logs/` ถูก ignore ใน git แล้ว และ mount เป็น volume ใน `docker-compose.yml`

แต่ละบรรทัดเก็บ: `timestamp` (ISO) + เวลาไทย, `level`, `source`, `message`, `requestId`,
`context` (query, ip, userAgent, …), `error` (name / message / stack / cause / digest),
`meta` (env, pid, hostname, runtime)

ดู log สด ๆ:

```bash
tail -f logs/app-$(date +%F).log | jq .
jq 'select(.level=="error")' logs/app-2026-08-26.log
```

## 3. ต้องเขียน try/catch ไหม? (คำถามที่ถูกถามบ่อยที่สุด)

**ไม่ต้อง** — error ที่ throw ออกมาถูกจับให้อยู่แล้วทุกชั้น เขียนไฟล์และส่ง Discord ให้เอง
สิ่งที่ทำให้ error หายคือการ **กลืน** มันเอง:

```ts
// ❌ error หายไปเลย — ไม่มี log ไม่มี Discord
try {
  await save(data)
} catch {
  return null
}

// ❌ console ไม่ลงไฟล์ และไม่เข้า Discord
try {
  await save(data)
} catch (error) {
  console.error(error)
}

// ✅ ไม่ต้อง catch — ปล่อยให้ throw แล้วระบบจับเอง
await save(data)

// ✅ ถ้าจำเป็นต้อง catch (ต้องคืน fallback ให้ผู้ใช้) → log ก่อนเสมอ
try {
  await save(data)
} catch (error) {
  logger.error('บันทึกข้อมูลไม่สำเร็จ', { error, context: { userId } })

  return null
}
```

สรุปเป็นตาราง:

| สถานการณ์ | ต้อง try/catch | ทำอะไร |
| :-- | :-- | :-- |
| Server component / page / server action throw | ไม่ต้อง | อัตโนมัติ |
| Route handler throw | ไม่ต้อง | อัตโนมัติ (ควรห่อ `withLogging` เพิ่ม requestId + timing) |
| Client render พัง / `window.onerror` / promise rejection | ไม่ต้อง | อัตโนมัติ |
| `uncaughtException` / `unhandledRejection` ของ process | ไม่ต้อง | อัตโนมัติ |
| catch เองเพื่อคืน fallback หรือตอบ 4xx | ต้อง | `logger.error(...)` ก่อน return |
| ปุ่ม/ฟอร์มฝั่ง client ทำงานไม่สำเร็จ | ต้อง | `clientLogger.error(...)` |
| middleware (`src/middleware.ts`) | — | edge runtime เขียนไฟล์ไม่ได้ **ห้าม import logger** |

> ไม่ต้องเขียน middleware ดัก error เองและไม่ต้องเรียก webhook เอง — เรียก `logger.*`
> หรือปล่อยให้ throw เท่านั้น การส่ง Discord เป็นหน้าที่ของ transport ชั้นใน

## 4. อะไรถูกจับบ้าง (อัตโนมัติ)

| แหล่ง | จับด้วย |
| :-- | :-- |
| Error ฝั่ง server ทุกชนิด (RSC, SSR, route handler) | `onRequestError` ใน `src/instrumentation.ts` |
| `uncaughtException` / `unhandledRejection` ของ process | `register()` ใน `src/instrumentation.ts` |
| Error ตอน render ฝั่ง React | `src/app/error.tsx`, `src/app/global-error.tsx` |
| `window.onerror` + promise rejection ในเบราว์เซอร์ | `<ErrorReporter />` ใน root layout → `POST /api/log` |

### เส้นทางของ error หนึ่งตัว

```
throw / logger.error()
        ↓
  emit()  (src/libs/logger/index.ts)      ← กรองตาม LOG_LEVEL, redact ความลับ
        ├─→ fileTransport   → logs/app-YYYY-MM-DD.log (+ error-*.log)
        ├─→ console         (ถ้า LOG_CONSOLE=true)
        └─→ discordTransport → Discord webhook   (เฉพาะ >= DISCORD_WEBHOOK_LEVEL, fire-and-forget)
```

ฝั่ง client ต่างกันแค่ช่วงต้น: `clientLogger` → `POST /api/log` → `emit()` เส้นเดิม

## 5. เขียน log เอง

**ฝั่ง server** (server component / route handler / server action):

```ts
import { logger } from '@/libs/logger'

logger.info('สร้างผู้ใช้ใหม่', { context: { userId } })
logger.error('บันทึกไม่สำเร็จ', { error, context: { userId } })
```

**ใน API route** — ห่อด้วย `withLogging` แล้วได้ log ที่ผูก `requestId` ให้ทุกบรรทัด
พร้อมจับ error + ตอบ 500 ให้เอง:

```ts
import { withLogging } from '@/libs/logger/withLogging'

export const GET = withLogging(async (req, { log }) => {
  log.info('กำลังดึงข้อมูล')

  return NextResponse.json(await getUsers())
})
```

**ฝั่ง client** (`'use client'`):

```ts
import { clientLogger } from '@/libs/logger/client'

clientLogger.error('บันทึกฟอร์มไม่สำเร็จ', { error, context: { formId } })
```

**ระบบภายนอก / สคริปต์ / non-React** — ยิงเข้า endpoint ตรง ๆ:

```
POST {basePath}/api/log        # basePath ตอนนี้คือ /digitalplan
Content-Type: application/json

{ "level": "error", "source": "client", "message": "...", "error": { "name": "...", "message": "...", "stack": "..." }, "context": { "userId": 1234 } }
```

- เป็น **public route** (อยู่ใน `publicRoutes`) เพราะต้องรายงาน error บนหน้า login ได้
- จำกัด 60 ครั้ง/นาที/IP (`LOG_CLIENT_MAX_PER_MINUTE`), ตอบ `{ "ok": true }` หรือ 429
- ทดสอบ: `curl -X POST http://localhost:3000/digitalplan/api/log/ -H 'Content-Type: application/json' -d '{"level":"error","message":"ทดสอบ"}'`

> ห้าม import `@/libs/logger` ใน client component (มันเป็น `server-only`) — ใช้ `client` แทน
> middleware รันบน edge runtime ที่ไม่มี filesystem จึงไม่ได้เขียนไฟล์

## 6. ความปลอดภัย / กันพัง

- ค่าใน key ที่อ่อนไหว (`password`, `token`, `secret`, `cookie`, `authorization`, …)
  ถูกแทนด้วย `[redacted]` ก่อนเขียนไฟล์และก่อนส่ง Discord
- กันข้อความซ้ำ: error เดิมภายใน `DISCORD_WEBHOOK_DEDUPE_MS` (60 วิ) ส่งครั้งเดียว
- จำกัด `DISCORD_WEBHOOK_MAX_PER_MINUTE` (20) ครั้ง/นาที และเคารพ 429 ของ Discord
- `/api/log` จำกัด 60 ครั้ง/นาที/IP
- ถ้าเขียนไฟล์ไม่ได้ (สิทธิ์/ดิสก์เต็ม) หรือ webhook ล้มเหลว ระบบจะไม่ทำให้แอปพัง

## 7. ต่อยอด (เพิ่ม transport ใหม่)

เพิ่ม LINE Notify / Sentry / Slack: สร้างไฟล์ใหม่ใน `src/libs/logger/` ที่ export ฟังก์ชัน
`send(entry: LogEntry)` แบบ **fire-and-forget** (ห้าม throw, ห้ามให้ผู้เรียกต้อง `await`)
แล้วเรียกเพิ่มใน `emit()` ที่ `src/libs/logger/index.ts` ข้าง ๆ `sendToDiscord(entry)`
ค่า config ใหม่ให้ไปไว้ที่ `src/libs/logger/config.ts` และเพิ่มใน `.env.example` ด้วย

## 8. ตัวแปรทั้งหมด

ดู `.env.example` หัวข้อ *Logging* — `LOG_ENABLED`, `LOG_LEVEL`, `LOG_DIR`, `LOG_FILE_PREFIX`,
`LOG_TIMEZONE`, `LOG_RETENTION_DAYS`, `LOG_CONSOLE`, `LOG_PRETTY`, `LOG_CLIENT_MAX_PER_MINUTE`,
`DISCORD_WEBHOOK_*`

## 9. สถานะปัจจุบัน (handoff)

**ทำเสร็จและทดสอบแล้ว**

- ไฟล์รายวัน + ไฟล์ error แยก, ตัดวันตามเวลาไทย, ลบไฟล์เก่าอัตโนมัติ
- Discord webhook ใส่ค่าแล้วใน `.env.local` / `.env.production` (ทดสอบส่งจริงผ่าน `/api/log` แล้ว)
- จุดดัก error ครบทุกชั้น: server / React / browser / process
- redact ความลับ, กัน error ซ้ำ, rate limit ทั้งฝั่ง webhook และฝั่ง `/api/log`
- `pnpm lint`, `tsc --noEmit`, `pnpm build` ผ่าน

**ยังทำได้อีก (optional)**

- ใส่ `userId` / `email` จาก session ลง `context` อัตโนมัติ — จุดที่เหมาะคือ `withLogging`
  (อ่าน token ด้วย `getToken` แล้ว `logger.child({ context: { userId } })`)
- middleware (edge) ยังไม่ได้ log — ถ้าต้องการ ให้ยิง `POST /api/log` จากใน middleware แทนการ import logger
- ถ้าจะรันหลาย instance/pod ควร mount `logs/` เป็น volume ร่วม หรือส่งต่อเข้าตัวรวม log (Loki / ELK)
- `docker-compose.yml` อ่าน `DISCORD_WEBHOOK_URL` จาก env ของ host — อย่าลืม export บนเซิร์ฟเวอร์
