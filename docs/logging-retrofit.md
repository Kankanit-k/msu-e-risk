# เพิ่มระบบ logging + Discord webhook เข้าโปรเจกต์เก่า

สำหรับโปรเจกต์ที่ **สร้างจาก template นี้ไปก่อนหน้า** แล้วยังไม่มี `src/libs/logger`
ระบบนี้เป็น "ก้อนแยก" ที่ไม่แตะโค้ดเดิมของคุณเลย — ก๊อปไฟล์เข้าไป แล้วแก้อีก 5 จุดเล็ก ๆ

> ถ้าเป็นโปรเจกต์ใหม่ที่ generate จาก template ตอนนี้ ก็มีมาให้แล้ว ข้ามหน้านี้ได้เลย

## สั่ง Claude Code ให้ทำให้ (ก๊อปทั้งบล็อกไปวางได้เลย)

เปิด Claude Code **ในโปรเจกต์เก่า** แล้ววางข้อความนี้ (แก้ชื่อโปรเจกต์ในบรรทัด
`DISCORD_WEBHOOK_USERNAME` ให้ตรงกับระบบนั้น จะได้รู้ว่า error มาจากที่ไหน):

```text
ติดตั้งระบบ logging (ไฟล์ log รายวัน + แจ้ง error เข้า Discord) จาก template เข้าโปรเจกต์นี้

1. git remote add template https://github.com/alicetears/mui-template.git
   git fetch template main
2. อ่าน checklist ของ template ก่อนลงมือ:
   git show template/main:docs/logging-retrofit.md
3. ทำตาม checklist นั้นทั้งหมด — ดึงไฟล์เข้ามา แล้วแก้ 5 จุดที่อัตโนมัติไม่ได้
   (ErrorReporter ใน root layout, env, /logs ใน .gitignore, /api/log ต้องเป็น public route,
   ติดตั้ง server-only) โดยปรับ path alias / โครงสร้างให้เข้ากับโปรเจกต์นี้
4. ใส่ค่า env ชุดนี้ลง .env.local และ .env.production (ห้ามก๊อป secret อื่นของ template มา
   โดยเฉพาะ AUTH_CLIENT_SECRET / NEXTAUTH_SECRET — ใช้ของโปรเจกต์นี้เท่านั้น):

LOG_ENABLED=true
LOG_LEVEL=info
LOG_DIR=logs
LOG_TIMEZONE=Asia/Bangkok
LOG_RETENTION_DAYS=30
LOG_CLIENT_MAX_PER_MINUTE=60
DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/1542040336711417866/gihdrvd2RhWqtSs9Cp39v77nU0fF1umcTcwrySoQZjE7HRKjpDTIKmnwOgte6m6ZMvbr
DISCORD_WEBHOOK_ENABLED=true
DISCORD_WEBHOOK_LEVEL=error
DISCORD_WEBHOOK_FORUM=true
DISCORD_WEBHOOK_USERNAME=<ชื่อโปรเจกต์นี้>
DISCORD_WEBHOOK_ENVIRONMENT=production
DISCORD_WEBHOOK_DEDUPE_MS=60000
DISCORD_WEBHOOK_MAX_PER_MINUTE=20

   (webhook ตัวนี้อยู่ใน forum channel จึงต้องมี DISCORD_WEBHOOK_FORUM=true ไม่งั้น Discord ตอบ 400)

5. รัน pnpm lint && pnpm build ให้ผ่าน แล้วทดสอบ:
   curl -X POST http://localhost:3000/api/log/ -H 'Content-Type: application/json' \
        -d '{"level":"error","message":"ทดสอบ logging จาก <ชื่อโปรเจกต์นี้>"}'
   (ถ้าโปรเจกต์มี basePath ให้ใส่นำหน้า /api/log ด้วย)
   ต้องได้ครบ 3 อย่าง: ตอบ {"ok":true} + มีบรรทัดใหม่ใน logs/app-YYYY-MM-DD.log + มีโพสต์ใน Discord
6. สรุปให้หน่อยว่าแก้ไฟล์อะไรไปบ้าง และมีอะไรที่ผมต้องทำต่อเอง
```

ทำไมต้องบอกให้อ่าน `docs/logging-retrofit.md` ก่อน: มันคือ checklist ที่ตัด "งานเดา" ออกไป —
Claude จะได้ไม่ต้องไล่ diff ทั้ง template และไม่ลืม 5 จุดที่ต้องแก้เอง (ข้อที่ลืมบ่อยที่สุดคือ
`/api/log` ต้องเป็น public route ไม่งั้น error ฝั่ง client โดน redirect ไปหน้า login เงียบ ๆ)

**อัปเดตทีหลัง** (เมื่อ template แก้ระบบ logging เพิ่ม) — พิมพ์:

```text
git fetch template main แล้วดู
git diff template/main -- src/libs/logger src/instrumentation.ts src/app/api/log
ถ้ามีของใหม่ให้อัปเดตเข้ามา โดยคงค่า config และส่วนที่โปรเจกต์นี้ปรับแต่งไว้
แล้วสรุปว่าเปลี่ยนอะไรบ้าง
```

**ข้อควรระวัง**

- ถ้าระบบ logging ยังไม่ถูก merge เข้า `main` ของ template ให้เปลี่ยน `main` ในคำสั่งทั้งหมด
  เป็นชื่อ branch ที่มีมันอยู่ (`git fetch template <branch>` / `git show template/<branch>:…`)
- template เป็น repo **private** — ถ้าใช้ Claude Code บนเว็บ (claude.ai/code) ต้องให้สิทธิ์เข้าถึง
  `alicetears/mui-template` ในเซสชันนั้นก่อน ไม่งั้น `git fetch` ไม่ผ่าน ทำในเครื่องด้วย CLI จะง่ายกว่า
  ถ้าติดจริง ๆ ให้สั่ง `bash /path/to/mui-template/scripts/add-logging.sh .` แทน
- webhook ด้านบนเป็นของ **ห้องรวม** ถ้าหลายโปรเจกต์ยิงเข้าห้องเดียวกัน ต้องตั้ง
  `DISCORD_WEBHOOK_USERNAME` และ `DISCORD_WEBHOOK_ENVIRONMENT` ให้ต่างกันทุกโปรเจกต์
  หรือจะสร้างโพสต์ประจำโปรเจกต์ในฟอรั่มแล้วตั้ง `DISCORD_WEBHOOK_THREAD_ID` เป็น id ของโพสต์นั้นก็ได้

## เลือกวิธี

| วิธี | เหมาะกับ |
| :-- | :-- |
| **A. ดึงจาก template ด้วย git** | โปรเจกต์ที่อยากอัปเดตซ้ำได้เรื่อย ๆ ในอนาคต (แนะนำ) |
| **B. สคริปต์ `add-logging.sh`** | มี template clone ไว้ในเครื่องอยู่แล้ว อยากได้ไว ๆ |
| **C. ก๊อปด้วยมือ** | โปรเจกต์ที่แก้โครงสร้างไปเยอะ |

ทั้ง 3 วิธีได้ไฟล์ชุดเดียวกัน และต้องทำ [ขั้นตอนที่ต้องแก้เอง](#ขั้นตอนที่ต้องแก้เอง-5-จุด) เหมือนกัน

---

## A. ดึงจาก template ด้วย git (แนะนำ)

ทำครั้งเดียวในโปรเจกต์เก่า:

```bash
git remote add template https://github.com/alicetears/mui-template.git
git fetch template main
```

แล้วดึงเฉพาะไฟล์ของระบบ logging เข้ามา (ไม่แตะไฟล์อื่น):

```bash
git checkout template/main -- \
  src/libs/logger \
  src/instrumentation.ts \
  src/components/ErrorReporter.tsx \
  src/app/api/log/route.ts \
  docs/logging.md \
  docs/logging-retrofit.md \
  .claude/skills/logging/SKILL.md

# error boundary — ข้ามถ้าโปรเจกต์คุณมี error.tsx ของตัวเองอยู่แล้ว
git checkout template/main -- src/app/error.tsx src/app/global-error.tsx
```

ข้อดี: คราวหน้า template แก้อะไร ก็ `git fetch template main` แล้วสั่ง `git checkout` ซ้ำได้เลย
และดู diff ก่อนได้ด้วย `git diff template/main -- src/libs/logger`

## B. สคริปต์

จาก template ที่ clone ไว้:

```bash
bash /path/to/mui-template/scripts/add-logging.sh /path/to/old-project
```

สคริปต์จะก๊อปเฉพาะไฟล์ที่ยังไม่มี (ไฟล์ที่ชนจะข้ามและรายงานให้) แล้วพิมพ์ checklist ท้ายสุด

## C. ก๊อปด้วยมือ

ไฟล์ทั้งหมดที่ต้องมี:

```
src/libs/logger/{types,config,serialize,fileTransport,discordTransport,index,client,withLogging}.ts
src/instrumentation.ts
src/components/ErrorReporter.tsx
src/app/api/log/route.ts
src/app/error.tsx            # ข้ามได้ถ้ามีของตัวเองแล้ว (แต่ต้องเติม clientLogger เข้าไป)
src/app/global-error.tsx     # เหมือนกัน
```

---

## ขั้นตอนที่ต้องแก้เอง (5 จุด)

### 1. ติดตั้ง `server-only`

```bash
pnpm add server-only
```

(ถ้า `package.json` มีอยู่แล้วข้ามได้ — template ชุดนี้มีมาตั้งแต่แรก)

### 2. ใส่ `<ErrorReporter />` ใน root layout

`src/app/layout.tsx` — วางไว้บนสุดของ `<body>` เพื่อดัก `window.onerror` และ promise rejection

```tsx
// Component Imports
import ErrorReporter from '@components/ErrorReporter'

// …

  <body className={…}>
    <ErrorReporter />
    {children}
  </body>
```

> ถ้าโปรเจกต์ไม่มี alias `@components` ให้ใช้ `@/components/ErrorReporter`

### 3. ตัวแปร env

ก๊อปบล็อก **Logging** ทั้งก้อนจาก `.env.example` ของ template ไปใส่ `.env.local`
และ `.env.production` ของโปรเจกต์เก่า อย่างน้อยที่สุดต้องมี:

```env
LOG_DIR=logs
LOG_TIMEZONE=Asia/Bangkok
LOG_RETENTION_DAYS=30
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy
DISCORD_WEBHOOK_ENVIRONMENT=production   # ให้แยกออกว่า alert มาจากโปรเจกต์/เครื่องไหน
DISCORD_WEBHOOK_USERNAME=ชื่อโปรเจกต์นี้   # จะได้รู้ว่า error มาจากระบบไหนตอนใช้ webhook ร่วมกัน
```

> ถ้าหลายโปรเจกต์ยิงเข้า **ห้องเดียวกัน** ให้ตั้ง `DISCORD_WEBHOOK_USERNAME` กับ
> `DISCORD_WEBHOOK_ENVIRONMENT` ให้ต่างกัน ไม่งั้นแยกไม่ออกว่า error มาจากระบบไหน

ถ้า webhook อยู่ใน **forum channel** ต้องเพิ่ม `DISCORD_WEBHOOK_FORUM=true` ด้วย ไม่งั้น Discord
ตอบ 400 (`must have a thread_name or thread_id`) — วิธีที่เข้าท่าเมื่อหลายโปรเจกต์ใช้ฟอรั่มเดียวกันคือ
สร้างโพสต์ประจำโปรเจกต์ไว้หนึ่งอัน แล้วตั้ง `DISCORD_WEBHOOK_THREAD_ID` เป็น id ของโพสต์นั้น

### 4. `.gitignore`

```
/logs
```

ถ้า deploy ด้วย Docker: `mkdir -p /app/logs` ใน Dockerfile, ตั้ง `ENV LOG_DIR=/app/logs`
และ mount `./logs:/app/logs` ใน `docker-compose.yml` (ดูตัวอย่างในไฟล์ของ template)

### 5. เปิดให้ `/api/log` เข้าถึงได้โดยไม่ต้องล็อกอิน

จำเป็น เพราะ error บนหน้า login ก็ต้องรายงานได้

- **ถ้าโปรเจกต์มี `src/configs/accessControl.ts`** (เวอร์ชันหลัง ๆ ของ template):
  เพิ่ม `'/api/log'` ใน `publicRoutes`
- **ถ้าไม่มี** — ไปที่ `src/middleware.ts` แล้วยกเว้น path นี้ใน matcher หรือ return
  `NextResponse.next()` ทันทีเมื่อ `pathname.startsWith('/api/log')`

ลืมข้อนี้แล้วจะเห็นอาการ: error ฝั่ง client ไม่เข้า Discord และ `/api/log` ตอบ 307 ไปหน้า login

---

## ตรวจว่าใช้ได้จริง

```bash
pnpm lint && pnpm build
pnpm start

# ถ้ามี basePath ให้ใส่นำหน้าด้วย เช่น /digitalplan/api/log/
curl -X POST http://localhost:3000/api/log/ \
  -H 'Content-Type: application/json' \
  -d '{"level":"error","message":"ทดสอบ retrofit"}'

tail -n 1 logs/app-$(date +%F).log | jq .
```

ต้องได้ครบ 3 อย่าง: ตอบ `{"ok":true}` → มีบรรทัดใหม่ในไฟล์ → มีข้อความเด้งในห้อง Discord

ถ้าไฟล์มีแต่ Discord เงียบ ให้ดู console ของ server — จะมี
`[logger] discord webhook rejected the alert (HTTP …)` หรือ `discord webhook failed` บอกสาเหตุ

## ข้อควรระวังตามเวอร์ชัน

- **Next.js 15+** — `instrumentation.ts` และ `onRequestError` ใช้ได้ทันที (template นี้ใช้ 16)
- **Next.js 14** — ต้องเปิด `experimental: { instrumentationHook: true }` ใน `next.config.ts`
  และ **ไม่มี** `onRequestError` (มาใน 15) ดังนั้น server error จะยังไม่ถูกดักอัตโนมัติ —
  ให้ห่อ route handler ด้วย `withLogging` และ `logger.error(...)` ใน catch เอง ส่วนที่เหลือใช้ได้ปกติ
- **`src/` directory** — ไฟล์ต้องเป็น `src/instrumentation.ts` (ไม่ใช่ root) ถ้าโปรเจกต์ใช้ `src/`
- **path alias** — โค้ดใช้ `@/libs/logger` และ `@components/…` ถ้าโปรเจกต์ตั้ง alias ไว้ต่างจากนี้
  ให้แก้ import ให้ตรง (`tsconfig.json` → `paths`)
- **หลาย instance / pod** — แต่ละ instance เขียนไฟล์ของตัวเอง ควร mount volume ร่วมหรือส่งต่อเข้า
  ตัวรวม log; ส่วน dedupe ของ Discord เป็นแบบ per-process จึงอาจเห็น error เดิมซ้ำตามจำนวน instance

## หลังติดตั้งเสร็จ

บอก agent/ทีมให้อ่าน `docs/logging.md` — สรุปสั้น ๆ คือ **ไม่ต้องเขียน try/catch เพื่อให้ error ถูก log**
และห้ามกลืน error ด้วย `catch {}` หรือ `console.error` ถ้าต้อง catch ให้เรียก
`logger.error(msg, { error, context })` ก่อนเสมอ
