# CLAUDE.md

Guidance for AI agents (and humans) working in this repo. Read this first — it tells you
where things live and how to make the most common changes without breaking the template.

## What this is

A **Next.js 16 (App Router) + MUI 7** admin dashboard template (based on Materio), customized
for Mahasarakham University (MSU) projects. It ships with:

- A vertical **and** horizontal layout, a theme **Customizer**, and light/dark modes.
- Cookie-persisted theme settings (mode, skin, layout, primary color).
- NextAuth (ERP-MSU OAuth) wiring and a small Express + Prisma backend under `backend/`.
- Brand defaults from the **MSU-BEPS** reference design: **Sarabun** body font,
  **Manrope / IBM Plex Sans Thai** headings, and a **purple** primary (`#6D4CFF`).

## Commands

Package manager is **pnpm** (see `packageManager` in `package.json`).

```bash
pnpm install        # also runs build:icons via postinstall
pnpm dev            # next dev --turbopack (http://localhost:3000)
pnpm build          # production build
pnpm start          # run the production build
pnpm lint           # eslint
pnpm lint:fix       # eslint --fix
pnpm format         # prettier write on src
pnpm build:icons    # regenerate the bundled Iconify CSS (run if you add new icons)
pnpm run init       # name a new system: abbreviation, Thai name, basePath, port (see below)
pnpm test:smoke     # Playwright smoke tests against `next start` on :3103 — run `pnpm build` first
```

`pnpm run init` needs the `run` (plain `pnpm init` is pnpm's own command); `npm run init` works too.

**Smoke tests** (`tests/smoke.spec.ts`, config in `playwright.config.ts`): an anonymous visit to a private
page returns a 401 "auth required" page at the same URL with no redirect, the public home `/` renders,
`/login` redirects to `/`, `/api/manual` answers 401 without a session, and a demo login (a session minted
with `NEXTAUTH_SECRET`, as in `scripts/manual/session.mjs`) opens `/home` and `/manual`. The server is started with route protection
on, whatever `.env.local` says. Set `SMOKE_BASE_URL` to test an already running server instead, or
`SMOKE_PORT` for another port. First run: `pnpm exec playwright install chromium`.

**CI** (`.github/workflows/ci.yml`) runs install → tsc → lint → build → smoke tests on every PR and on
pushes to `main`, with dummy env values only.

> Fonts are loaded with `next/font/google`, so **the first build needs network access** to
> fetch Sarabun / Manrope / IBM Plex Sans Thai.

## Project map

```
src/
  app/                         Next.js App Router
    (private)/                 Dashboard-layout area (public and private pages, see access table)
      layout.tsx               Wraps pages in the vertical/horizontal layout
      page.tsx                 Public home (/)
      auth-required/           401 page shown to anonymous visitors of private pages
      demo/                    Demo role simulator (only when DEMO_MODE is on)
      home/ about/ users/      Example pages — copy these
      dashboards/{crm,analytics}/
    (blank-layout-pages)/      No-chrome pages (none shipped by default)
    api/auth/[...nextauth]/    NextAuth route
    layout.tsx                 Root layout: <html>, fonts, color-scheme script
    globals.css                Tailwind v4 layers + CSS variables
  @core/                       Template core — theme, hooks, settings, MUI overrides
    theme/index.ts             ★ Typography + shape + shadows wiring
    theme/fonts.ts             ★ Font definitions (Sarabun / Manrope / IBM Plex Sans Thai)
    theme/colorSchemes.ts      ★ Full light/dark palettes
    styles/vertical/           ★ Sidebar item + section styling
    contexts/settingsContext   Default settings + cookie persistence
  @layouts/ @menu/             Layout primitives and the menu engine (rarely edited)
  components/
    GenerateMenu.tsx           Renders menu data → MUI menu components
    layout/{vertical,horizontal}/  Navbar, Navigation, *Menu wiring
    layout/shared/Logo.tsx     ★ Sidebar brand block (title + subtitle)
    theme/index.tsx            CustomThemeProvider (merges primaryColor into the theme)
  libs/logger/                 ★ Logging: daily files + Discord alerts (see docs/logging.md)
    index.ts                   server logger (`logger`) — server-only
    client.ts                  browser logger (`clientLogger`) → POST /api/log
    withLogging.ts             wrapper for API route handlers
    config.ts                  every LOG_* / DISCORD_WEBHOOK_* env var
    fileTransport.ts           daily file, rotation, retention
    discordTransport.ts        webhook embeds, dedupe, rate limit
  libs/demo.ts                 DEMO_MODE flag + isDemoToken() — edge-safe, used by middleware
  libs/roleResolver.ts         ERP STAFFID → app role (server-only; ROLE_* env vars)
  instrumentation.ts           ★ Global error capture (onRequestError + process hooks)
  configs/
    themeConfig.ts             ★ templateName, subtitle, layout, homePageUrl, cookie name
    primaryColorConfig.ts      ★ Primary color palette; FIRST entry = default
    roles.ts                   ★ Role catalog, permission matrix, demo personas (see docs/roles.md)
  data/navigation/
    verticalMenuData.tsx       ★ Sidebar menu (single source of truth)
    horizontalMenuData.tsx     ★ Top menu (horizontal layout)
  views/                       Page-specific composition (dashboard widgets, etc.)
  types/menuTypes.ts           Menu data types (Section / SubMenu / Item)
backend/                       Express + Prisma API (separate package.json)
```

★ = the files you will most often edit. Path aliases: `@/* → src/*`, plus `@core`, `@layouts`,
`@menu`, `@components`, `@configs`, `@views`, `@assets` (see `tsconfig.json`).

## How to… (common tasks)

### Add a new page + sidebar entry
1. Create `src/app/(private)/<route>/page.tsx` (copy `home/page.tsx` or `about/page.tsx`).
2. Add an item to `src/data/navigation/verticalMenuData.tsx` (and `horizontalMenuData.tsx`
   if you use the horizontal layout) **in the right group** (see below). Use a Remix Icon class.
3. That's it — the menu is data-driven; no component edits needed.

Full recipe with snippets: `.claude/skills/add-page/SKILL.md`.

### Access control & routing (read before adding routes)

Four access tiers (low → high), defined in [src/configs/accessControl.ts](src/configs/accessControl.ts)
and **enforced** by [src/middleware.ts](src/middleware.ts). Tiers are inclusive — a higher tier sees
everything below it.

| Tier | ใคร | Routes (without basePath) | Sidebar section |
| :-- | :-- | :-- | :-- |
| `public` | ทุกคน — ไม่ต้องล็อกอิน | `/`, `/auth-required`, `/demo`, `/api/auth/*`, static **+ any route in `publicRoutes`** (e.g. `/dashboards/analytics`, `/users`) | shown with a `สาธารณะ` badge |
| `user` | ผู้ใช้ที่ล็อกอินแล้ว | ทุกหน้าใน `(private)` ที่ไม่ใช่ public: `/home`, `/about`, `/dashboards/**` | แดชบอร์ด, ตาราง, อื่น ๆ |
| `deptAdmin` | ผู้ดูแล **หน่วยงาน/คณะ** | `/admin/**` | ผู้ดูแลหน่วยงาน |
| `universityAdmin` | ผู้ดูแล **มหาวิทยาลัย** | `/admin/university/**` | ผู้ดูแลมหาวิทยาลัย |

Anything not listed in `routeAccessRules` defaults to `user` (login required).

**Conventions**
- Keep paths shallow — aim for ≤ 3 segments (`/admin/manage-users`, `/admin/university/units`, `/api/test`).
- Admin pages go under `/admin/**`; university-wide pages under `/admin/university/**`.
- Group sidebar items by purpose: `แดชบอร์ด` (dashboards), `ตาราง` (tables), then admin sections.

**Protect a new route:** its tier comes from its path prefix in `routeAccessRules` (accessControl.ts).
To raise the tier of an area, add/adjust a prefix rule there — middleware applies it automatically.
The menu (`verticalMenuData(role)`) shows admin sections only at the matching tier; that's *visibility*,
not enforcement.

**Make a dashboard/table public (no login):** add its path to `publicRoutes` in
[accessControl.ts](src/configs/accessControl.ts). Middleware then skips the auth check for it, and
the sidebar item automatically gets a `สาธารณะ` badge (the page still renders inside the dashboard
layout). Examples shipped: `/dashboards/analytics` and `/users`.

**HARD RULE — Login is user-initiated only.**
- Never call `signIn()` from an effect, a layout, a render path, or a server redirect. Nothing may send
  a visitor to a login page or to `erp.msu.ac.th` automatically.
- The only entry point is the profile menu: the "เข้าสู่ระบบ" item in
  [UserDropdown.tsx](src/components/layout/shared/UserDropdown.tsx) calls
  `signIn('erpauth', { callbackUrl: window.location.href })`. Logout is `signOut({ callbackUrl: <basePath>/ })`.
- [middleware.ts](src/middleware.ts) does not redirect anonymous requests for private pages. It rewrites
  them to `/auth-required` with status 401 and keeps the URL unchanged. That page has no sign-in button;
  it tells the visitor to click the profile picture at the top right.
- Login is ERP OAuth only (`erpauth`, [src/libs/ErpAuth.ts](src/libs/ErpAuth.ts)). The system's old login
  page is archived in `docs/archive/login/`; do not restore it or import it. `/login` redirects to `/`
  (`next.config.ts`).
- Public pages (`publicRoutes`) stay readable without an account; editing belongs behind the login.
- Test this in a real browser. `curl` does not run JS, so it cannot catch a client-side sign-in call.

> `AUTH_DISABLED` is server-side only. The client reads `NEXT_PUBLIC_AUTH_DISABLED` —
> keep both set to the same value.

**Wiring real roles and auth:**
- `resolveUserLevel(token)` (accessControl.ts) maps the NextAuth token → tier. The `role` claim is set in
  the `jwt` callback of [src/libs/ErpAuth.ts](src/libs/ErpAuth.ts) on first sign-in, from
  `resolveRoleForStaff(STAFFID)` in [src/libs/roleResolver.ts](src/libs/roleResolver.ts) (server-only).
  It reads `ROLE_UNIVERSITY_ADMINS` and `ROLE_DEPT_ADMINS` (comma-separated STAFFIDs); anyone not listed
  gets `user`.
- The **role toggle** in the top-right profile menu ([UserDropdown.tsx](src/components/layout/shared/UserDropdown.tsx))
  switches the *viewed* role via `useRole()`. It is clamped to the real role from the session, so it can
  lower the view but never raise it. `useIsAdmin()` ([src/hooks/useRole.ts](src/hooks/useRole.ts)) gates
  whether it appears.
- **Local dev:** set `AUTH_DISABLED=true` in `.env.local` to bypass all checks while developing
  (already set). Keep it `false`/unset in production.

### Demo mode / role simulator

For showing the system without ERP. Off by default.
- Env: `DEMO_MODE=true` (server, read by `src/libs/demo.ts`) and `NEXT_PUBLIC_DEMO_MODE=true` (client).
  Set both or neither.
- The `/demo` page lists the fictional personas from `demoPersonas` in `src/configs/roles.ts`. Choosing one
  calls `POST /api/demo/session` with `{ personaId }`, which sets a NextAuth-format session cookie
  (`demo: true`, max age 8 hours). `personaId` `guest` clears it; `DELETE /api/demo/session` also clears it.
  Both return 404 when `DEMO_MODE` is off.
- Personas are fictional. Never use real people's names or data in them.
- A demo token is ignored when `DEMO_MODE` is off (it resolves to `public`), but never enable demo mode on
  real production.
- A banner marks the session as a demo session while it is active.
- Details and how to present it: [docs/roles.md](docs/roles.md).

### Change the primary (accent) color
Edit the **first** entry of `src/configs/primaryColorConfig.ts` (`primary-msu`). That value is
the runtime default (`settingsContext` → `primaryColor`) and overrides the palette. For
consistency, mirror it in `src/@core/theme/colorSchemes.ts` (`primary.main/light/dark`).

### Change fonts or sizes
All fonts live in `src/@core/theme/fonts.ts`. Swap the `next/font/google` loaders and keep the
exported `bodyFontFamily` / `headingFontFamily` strings. Base font **size** and heading scale
are in `src/@core/theme/index.ts` (`typography`).

### Restyle the sidebar
- Item look (active pill, left accent bar, radius): `src/@core/styles/vertical/menuItemStyles.ts`
- Section heading look (uppercase purple label): `src/@core/styles/vertical/menuSectionStyles.ts`
- Brand block (logo, title, subtitle): `src/components/layout/shared/Logo.tsx` +
  `templateName`/`templateSubtitle` in `src/configs/themeConfig.ts`.

### Default layout / mode
`src/configs/themeConfig.ts` — `layout` (`vertical` | `collapsed` | `horizontal`), `mode`
(`system` | `light` | `dark`), `homePageUrl`. Note: mode/skin/layout are cookie-backed, so to
see config changes locally you must **reset via the Customizer** or clear the settings cookie
(`themeConfig.settingsCookieName`).

### Logging & error alerts (read before adding try/catch)

ทุก error ของระบบถูกบันทึกลงไฟล์ **วันละ 1 ไฟล์** (`logs/app-YYYY-MM-DD.log` + `logs/error-YYYY-MM-DD.log`)
และส่งเข้า **Discord webhook** อัตโนมัติ ตั้งค่าที่ `DISCORD_WEBHOOK_URL` ใน `.env` อย่างเดียว

**สำคัญที่สุด: error ที่ throw ออกมาถูกจับให้อัตโนมัติอยู่แล้ว — ไม่ต้องเขียน try/catch เพื่อให้ log**
สิ่งที่ทำให้ error หายคือการ *กลืน* มัน (`catch {}` หรือ `catch (e) { console.error(e) }`)
`console.*` ไม่ลงไฟล์และไม่เข้า Discord — ถ้าจำเป็นต้อง catch ให้ `logger.error(msg, { error, context })` ก่อนเสมอ

| อยากได้อะไร | ใช้ |
| :-- | :-- |
| Log ฝั่ง server (page, server action, lib) | `import { logger } from '@/libs/logger'` → `logger.info/warn/error/fatal(msg, { error, context })` |
| API route ใหม่ | ห่อด้วย `withLogging` (`@/libs/logger/withLogging`) → ได้ requestId, timing, จับ error + ตอบ 500 ให้ |
| Log ฝั่ง client (`'use client'`) | `import { clientLogger } from '@/libs/logger/client'` (ห้าม import `@/libs/logger` — เป็น `server-only`) |
| ระบบภายนอก / non-React | `POST {basePath}/api/log` — public route, body: `{ level, source, message, error, context }` |

จุดที่ดัก error ให้อัตโนมัติแล้ว: `src/instrumentation.ts` (server error ทุกชนิด + uncaughtException/
unhandledRejection), `src/app/error.tsx`, `src/app/global-error.tsx`, `src/components/ErrorReporter.tsx`
(window.onerror + promise rejection) และ `src/app/api/log/route.ts`
middleware รันบน edge runtime — เขียนไฟล์ไม่ได้ **ห้าม import logger ที่นั่น**

ถ้า webhook อยู่ใน **forum channel** ต้องตั้ง `DISCORD_WEBHOOK_FORUM=true` (ไม่งั้น Discord ตอบ 400) —
โหมดนี้เปิดโพสต์ใหม่ต่อ error หนึ่งชนิด แล้ว error เดิมตอบกลับเข้าโพสต์เดิม; `DISCORD_WEBHOOK_THREAD_ID`
บังคับให้ทุก alert ไปกองในโพสต์/เธรดเดียว

Key ที่อ่อนไหว (`password`, `token`, `secret`, `cookie`, `authorization`, …) ถูก `[redacted]` ให้เอง
ใส่ข้อมูลใน `context` อย่าใส่ใน `message`. กันสแปม Discord: dedupe 60 วิ + 20 ข้อความ/นาที (ไฟล์ยังครบ)

โค้ดทั้งหมดอยู่ที่ `src/libs/logger/` — คู่มือ: `docs/logging.md`, สูตรสำเร็จ: `.claude/skills/logging/SKILL.md`
ติดตั้งย้อนหลังในโปรเจกต์เก่าที่ generate จาก template ไปก่อนแล้ว: `docs/logging-retrofit.md`
(หรือสั่ง `bash scripts/add-logging.sh <path-to-old-project>`)

### Chatbot / MCP tools (read before adding a feature)

Put business logic in `src/services/*`, then call it from both the page and a tool. Every action a
user could reasonably ask a chatbot to do gets a tool in `src/mcp/tools/` plus one line in
`src/mcp/registry.ts`. Recipe: `.claude/skills/add-mcp-tool/SKILL.md`. Write tools only create a
pending action that the human confirms, and there are no delete/bulk tools without review. Details: `docs/mcp.md`.

### Tour, manual & video manual

Every page gets a help entry in `src/data/help/index.ts` (steps with `data-tour` targets). That single
entry drives the in-app tour (navbar `?` button, auto-plays on first visit), the `/manual` page, and
the chatbot's `get_help`. After UI changes, regenerate the illustrations with a running server:
`pnpm manual:capture` (screenshots + PDF) and `pnpm manual:video` (MP4 with Thai narration + subtitles).
Capture uses a demo user only — never real personal data. Details: `docs/manual.md`.

### Auth, base path, env
See `guide.md` for `basePath`, NextAuth (`src/libs/ErpAuth.ts`), and the env-var table.

## Conventions

- **TypeScript + functional components.** Named consts exported as default (`const X = () => …; export default X`).
- **Import grouping with banner comments** (`// MUI Imports`, `// Component Imports`, …) —
  match the surrounding files.
- **Logical CSS properties** (`inlineSize`, `paddingInlineStart`, `insetInlineStart`) because the
  template supports RTL. Avoid `left/right/width` in styles.
- **Icons:** Remix Icon classes, e.g. `<i className='ri-user-line' />`. Browse at remixicon.com.
- **MUI Grid v7 API:** `<Grid size={{ xs: 12, md: 6 }}>` (not the old `item xs={}`).
- Run `pnpm lint` (and `pnpm test:smoke` after a build) before declaring done.

## Starting a new system (workflow)

0. **Roles first (decide before building).** List every actor, including the anonymous visitor, and what
   each one sees and does. Fill `src/configs/roles.ts` (catalog + `permissionMatrix`), `publicRoutes` and
   `routeAccessRules` once, then build pages. See `docs/roles.md`.
1. **Clone** this template into the new project folder.
2. **Name it** — run `npm run init`: it asks for the abbreviation, the Thai name, the basePath and
   the port, rewrites every `⚠️ rename` spot plus basePath/port, and creates `.env.local` with a fresh
   `NEXTAUTH_SECRET` only if that file does not exist yet (safe to re-run). By hand: `CONFIG` at the top of `html/index.html` *and* `src/configs/themeConfig.ts`
   (see "Naming the system" below).
3. **Mock up in `html/index.html` first.** Single file, no build, opens by double-click — edit
   `MENU` (sidebar groups/items, `minRole` for admin groups) and the page content, then show it to
   the people who will use/approve the system. Iterate here while requirements are still moving;
   it's far cheaper than changing Next.js routes, auth and data wiring.
4. **Convert to Next.js once the mockup is agreed:** each `MENU` item → `src/app/(private)/<route>/page.tsx`
   + an entry in `verticalMenuData.tsx` (same labels/icons/groups); `minRole` groups → `/admin/**`
   or `/admin/university/**`; public items → `publicRoutes`. Then wire real data/auth.
5. Keep `html/` in the repo as the agreed spec, or delete it once the Next.js pages exist.

`html/index.html` mirrors the Next.js shell (sidebar style, remembered folded groups, role switch
in the profile menu, crest logo block, `<page> | MSU-<ABBR>` titles, light default + dark toggle,
mobile drawer). If you change the shell in one, change the other.

## Naming the system (do this first in every new project)

The template ships with the placeholder `MSU-APP` / `ชื่อระบบเต็ม มมส` — **rename it before anything
else**; stale names leak into the browser tab, the sidebar, and the public home page.

- Edit `src/configs/themeConfig.ts` (and `CONFIG` in `html/index.html`):
  - `templateOverline` → `'Mahasarakham University'` (keep)
  - `templateName` → `'MSU-<ABBR>'` — uppercase English abbreviation, e.g. `MSU-CAR`, `MSU-QA`
  - `templateSubtitle` → full Thai system name, e.g. `'ระบบขอใช้รถ มมส'`
- The sidebar logo block and the browser-tab title both read these. Never hard-code a system
  name in `layout.tsx`, `Logo.tsx`, or a page.
- Tab title format: `<หน้า> | MSU-<ABBR>` (home: `MSU-<ABBR> — <ชื่อเต็ม>`). Every page sets
  **only its own Thai page name** via `export const metadata = { title: '<ชื่อหน้า>' }`.
  A `'use client'` page can't export metadata — put it in a sibling `layout.tsx`
  (`export const metadata = { title: '…' }` + `const Layout = ({ children }) => children`).
- `settingsCookieName` follows `templateName` automatically. Also rename, per system, `basePath` (`next.config.ts` + `.env*`)
  and the ERP `progcode` in the `userinfo` URL of `src/libs/ErpAuth.ts`.
- Check: `grep -rn "MSU-APP\|ชื่อระบบเต็ม\|MSU Starter Kit\|digitalplan" src html next.config.ts .env*` should
  return nothing except the values you just set.

## Gotchas

- Settings (mode/skin/layout/primaryColor) are stored in a cookie and win over `themeConfig`.
- Don't reference a route in menu data before its `page.tsx` exists (it will 404).
- `next/font` needs network on first build; CI/offline builds must cache the fonts.
- `package.sh` / `package.ps1` write `mui-template.tar.gz` at the repo root. It is a local packaging
  artifact, ignored by git (`*.tar.gz`) — never commit it.
