# Public home, ERP-only login, role catalog + demo role simulator

Goal: (1) a public home page (`/`) readable without login, (2) the system's own login page is archived and
login is ERP OAuth (erp.msu.ac.th) only, (3) login happens ONLY when the user clicks the profile avatar (top right)
and chooses "เข้าสู่ระบบ" — NO automatic redirect to a login page or to ERP anywhere, (4) a role catalog decided up
front for every new system, and (5) a demo "role simulator" page that signs in as a fictional persona without ERP.

## Shared spec (all workers follow; paths without basePath)

Tiers stay: `public < user < deptAdmin < universityAdmin` (src/configs/accessControl.ts).

Public routes (publicRoutes): `/` (exact only), `/auth-required`, `/demo`, `/api/demo`, plus existing ones
(`/dashboards/analytics`, `/users`, `/api/log`, `/api/mcp`, `/api/oauth`, `/api/chat`, `/api/actions`, `/api/files`,
`/oauth`, `/actions`). REMOVE `/login`.

Unauthenticated visit to a non-public page: middleware does NOT redirect. It rewrites to `/auth-required`
with status 401 (`NextResponse.rewrite(url, { status: 401 })`), URL stays unchanged. That page renders inside the
dashboard layout (navbar visible) and says: this page needs sign-in; click the profile picture at the top right and
choose "เข้าสู่ระบบด้วย ERP". The page has NO sign-in button and NEVER calls signIn.

Sign-in entry point (the only one): menu item in `UserDropdown` -> `signIn('erpauth', { callbackUrl: window.location.href })`.
Logout: `signOut({ callbackUrl: <basePath>/ })`. Nothing may call signIn from an effect/render/server redirect.

Demo mode: env `DEMO_MODE=true` (server) and `NEXT_PUBLIC_DEMO_MODE=true` (client), default off.
Edge-safe helper `src/libs/demo.ts` (no node-only imports; used by middleware): exports
`DEMO_MODE: boolean` (= process.env.DEMO_MODE === 'true'), and `isDemoToken(token): boolean` (= token?.demo === true).
`resolveUserLevel(token)` in accessControl.ts: if `isDemoToken(token) && !DEMO_MODE` -> `'public'` (a demo
token is worthless when demo mode is off); otherwise as before.
Demo session = a real NextAuth JWT minted with `encode` from `next-auth/jwt` and set as the NextAuth session cookie
(name `next-auth.session-token`, or `__Secure-next-auth.session-token` when the request is https), token shape
`{ sub, role, demo: true, user: { id, STAFFID, name, STAFFNAME, STAFFSURNAME, STAFFEMAIL1, POSITIONNAME, SCOPES:{groupname, staffdepartmentname}, role } }`
with fictional persona data (never real people). API `POST /api/demo/session` body `{ personaId }` (404 when
DEMO_MODE off; 400 on unknown persona; personaId `guest` clears the cookie) and `DELETE /api/demo/session` clears it.
Max age 8h. No new dependencies.

Role catalog `src/configs/roles.ts` (single source for docs/UI/demo): for each of `guest`(=public), `user`,
`deptAdmin`, `universityAdmin`: `{ id, level, label (Thai), description (Thai, who they are), icon (remix class),
can: string[] (Thai capabilities), persona (demo identity: name, position, unit) }`, plus
`permissionMatrix: { feature: string; minLevel: AccessLevel }[]` mirroring the routes (home public, analytics public,
users public, dashboards crm user, requests user, admin/users deptAdmin, admin/audit deptAdmin, admin/university/units
universityAdmin ...). Export `demoPersonas` derived from it.

Real roles from ERP: `src/libs/roleResolver.ts` (server-only) `resolveRoleForStaff(staffId: string): AppRole` reads
env `ROLE_UNIVERSITY_ADMINS` and `ROLE_DEPT_ADMINS` (comma separated STAFFIDs), default `'user'`; ErpAuth `jwt`
callback sets `token.role` on first sign-in.

Public home `/` : page at `src/app/(private)/page.tsx` (replaces the current profile dashboard; move that profile
content to `/home` if `/home` doesn't already show it). Content, readable by anyone and useful on its own: system name
(themeConfig), short intro, KPI cards with sample/aggregate data, links to the public dashboards (`/dashboards/analytics`,
`/users`), a "ติดตามตัวอย่างสิทธิ์" card linking `/demo` when demo mode is on, and a hint: logged-in staff get more features
via the profile menu. Follow `.claude/skills/add-page`, MUI Grid v7 API, logical CSS, Thai copy. `themeConfig.homePageUrl` -> `'/'`.

Archive: `git mv` `src/app/(blank-layout-pages)/login/page.tsx` and `src/views/Login.tsx` to
`docs/archive/login/page.tsx.txt` and `docs/archive/login/Login.tsx.txt` + a short README there (why archived, how to restore).
`/login` -> `next.config.ts` redirects to `/` (non-permanent; basePath handled by Next). Nothing in src may import Login.

Project gates: pnpm, TypeScript, banner-comment imports, `pnpm lint`, `pnpm exec tsc --noEmit`.
