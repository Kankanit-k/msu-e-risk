# AGENTS.md

This repo's agent guidance lives in **[CLAUDE.md](./CLAUDE.md)** — read it first.

Quick orientation (full detail in CLAUDE.md):

- **Stack:** Next.js 16 (App Router) + MUI 7 admin template, pnpm.
- **Run:** `pnpm install` → `pnpm dev` (http://localhost:3000). Lint with `pnpm lint`.
- **Most-edited files:**
  - Sidebar menu → `src/data/navigation/verticalMenuData.tsx`
  - Fonts → `src/@core/theme/fonts.ts`
  - Typography/sizes → `src/@core/theme/index.ts`
  - Primary color → `src/configs/primaryColorConfig.ts` (first entry = default)
  - Sidebar styling → `src/@core/styles/vertical/menuItemStyles.ts` & `menuSectionStyles.ts`
  - Brand block → `src/components/layout/shared/Logo.tsx` + `src/configs/themeConfig.ts`
- **Add a page:** create `src/app/(private)/<route>/page.tsx`, then add it to the menu data.
  Step-by-step: `.claude/skills/add-page/SKILL.md`.
- **Access control (4 tiers)** — defined in `src/configs/accessControl.ts`, enforced by
  `src/middleware.ts`. See CLAUDE.md → "Access control & routing" for the full table.
  - `public` (no login): `/`, `/auth-required`, `/demo`, `/api/auth/*`, static, plus `publicRoutes`.
  - `user` (login): the `(private)` app — `/home`, `/about`, `/users`, `/dashboards/**`.
  - `deptAdmin` (ผู้ดูแลหน่วยงาน): `/admin/**`.
  - `universityAdmin` (ผู้ดูแลมหาวิทยาลัย): `/admin/university/**`.
  - Keep paths shallow (**≤ 3 segments**). A route's tier = its prefix rule in `routeAccessRules`;
    unlisted paths default to `user`.
  - Login is user-initiated only: never call `signIn()` from effects, layouts or redirects; the only entry
    is the profile menu. Private pages return a 401 `/auth-required` page, not a redirect. `/login` redirects to `/`.
  - Roles: define them first in `src/configs/roles.ts` (see `docs/roles.md`). Real roles come from
    `ROLE_UNIVERSITY_ADMINS` / `ROLE_DEPT_ADMINS` via `src/libs/roleResolver.ts`. Demo simulator: `DEMO_MODE`
    (see CLAUDE.md). Local dev bypass: `AUTH_DISABLED=true` in `.env.local`.
- **Logging & error alerts:** error ที่ throw ถูกจับ → เขียนไฟล์ `logs/app-YYYY-MM-DD.log` (+ `error-*.log`)
  → ส่ง Discord webhook อัตโนมัติ **ไม่ต้องเขียน try/catch เพื่อให้ log**; ห้ามกลืน error ด้วย `catch {}` /
  `console.error` (ไม่ลงไฟล์ ไม่เข้า Discord) — ถ้าต้อง catch ให้ `logger.error(msg, { error, context })` ก่อน.
  Server: `@/libs/logger` · client: `@/libs/logger/client` · API route: ห่อ `withLogging` ·
  ระบบอื่น: `POST {basePath}/api/log`. ห้าม import logger ใน middleware (edge runtime).
  รายละเอียด: `docs/logging.md` / `.claude/skills/logging/SKILL.md`.
  ติดตั้งเข้าโปรเจกต์เก่า: `docs/logging-retrofit.md` (`bash scripts/add-logging.sh <target>`).
- **Conventions:** TypeScript functional components, banner-comment import groups, logical CSS
  properties (RTL-safe), Remix Icon classes, MUI Grid v7 `size={{}}` API.
- **Gotcha:** theme settings are cookie-persisted and override `themeConfig`; reset via the
  Customizer to see config changes locally.
- **Auth / basePath / env:** see `guide.md`.
