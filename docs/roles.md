# Roles and access

Decide the roles of a new system **before** building pages. Every route, menu item and API is then
tied to a role from the start, instead of being retrofitted later.

Single source of truth: [`src/configs/roles.ts`](../src/configs/roles.ts) (role catalog, permission
matrix, demo personas). Enforcement: [`src/configs/accessControl.ts`](../src/configs/accessControl.ts)
and [`src/middleware.ts`](../src/middleware.ts).

## 1. Four-tier role model

Tiers are inclusive: a higher tier sees everything below it.

| Tier (`AccessLevel`) | Catalog id | Who | Typical scope |
| :-- | :-- | :-- | :-- |
| `public` | `guest` | ทุกคน — ไม่ต้องล็อกอิน (anonymous visitor) | Public home, public dashboards, `/demo` |
| `user` | `user` | ผู้ใช้ที่ล็อกอินด้วย ERP แล้ว (every signed-in staff member) | Private pages: own data, requests, dashboards |
| `deptAdmin` | `deptAdmin` | ผู้ดูแลหน่วยงาน / คณะ (unit or faculty admin) | `/admin/**` — the unit's data and approvals |
| `universityAdmin` | `universityAdmin` | ผู้ดูแลมหาวิทยาลัย (university-wide admin) | `/admin/university/**` — all units |

Enforcement is by route prefix (`routeAccessRules`) and `publicRoutes`. The sidebar only hides links;
middleware does the real check.

## 2. Checklist: defining the actors of a new system

Fill this in with the people who will use or approve the system, before writing any page. Include the
anonymous visitor as an actor, even if the answer is "nothing".

| # | Question | Example answer | Goes to |
| :-- | :-- | :-- | :-- |
| 1 | Who are the actors? (list every one, including the anonymous visitor) | ผู้เยี่ยมชม, นักศึกษา, เจ้าหน้าที่, หัวหน้าภาค, ผู้ดูแลระบบ | `roles.ts` catalog entries |
| 2 | What can each actor see without signing in? | ภาพรวมตัวเลข, รายงานสาธารณะ | `publicRoutes` |
| 3 | What does each signed-in actor see and do? | ยื่นคำขอของตัวเอง, ดูคำขอของหน่วยงาน | `permissionMatrix`, `routeAccessRules` |
| 4 | Which tier is each actor? | `guest`, `user`, `deptAdmin`, `universityAdmin` | `can`, `level` in the catalog |
| 5 | Whose data can each actor see? (own / unit / university) | own requests / unit requests / all | Data queries in `src/services/*` |
| 6 | Who is a deptAdmin or universityAdmin in ERP? (STAFFIDs) | list of STAFFIDs | `ROLE_DEPT_ADMINS`, `ROLE_UNIVERSITY_ADMINS` |
| 7 | What is a fictional persona for each actor (for the demo)? | ชื่อสมมติ, ตำแหน่งสมมติ, หน่วยงานสมมติ | `persona` in the catalog |
| 8 | Which actions need approval or confirmation? | อนุมัติคำขอ (deptAdmin) | Page + API checks |

When this is agreed, fill `src/configs/roles.ts`, `publicRoutes` and `routeAccessRules` once. After that,
build pages and add each new route to `permissionMatrix`.

## 3. Catalog and permission matrix

Each role in `src/configs/roles.ts` has this shape:

```ts
{
  id: 'user',
  level: 'user',                  // AccessLevel: public | user | deptAdmin | universityAdmin
  label: '<ชื่อบทบาท>',
  description: '<ใครคือบทบาทนี้>',
  icon: 'ri-user-line',
  can: ['<สิ่งที่ทำได้ 1>', '<สิ่งที่ทำได้ 2>'],
  persona: { name: '<ชื่อสมมติ>', position: '<ตำแหน่งสมมติ>', unit: '<หน่วยงานสมมติ>' }
}
```

The permission matrix mirrors the routes, one row per feature:

```ts
permissionMatrix: [
  { feature: 'home', minLevel: 'public' },
  { feature: 'requests', minLevel: 'user' },
  { feature: 'admin/users', minLevel: 'deptAdmin' },
  { feature: 'admin/university/units', minLevel: 'universityAdmin' }
]
```

Template for the design review:

| Feature (route) | Min level | guest | user | deptAdmin | universityAdmin |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `<route>` | `public` / `user` / `deptAdmin` / `universityAdmin` | Yes / No | Yes / No | Yes / No | Yes / No |

Use `Yes` where the role can use the feature and `No` where it cannot. The `minLevel` column and the ticks
must agree. A feature that `guest` can use must also be in `publicRoutes`.

## 4. How real roles are assigned

- Login is ERP OAuth only (`erpauth`). The user signs in from the profile menu; nothing signs them in
  automatically.
- On sign-in, the `jwt` callback in [`src/libs/ErpAuth.ts`](../src/libs/ErpAuth.ts) sets `token.role` from
  `resolveRoleForStaff(STAFFID)` in [`src/libs/roleResolver.ts`](../src/libs/roleResolver.ts).
- `resolveRoleForStaff` is server-only. It reads two env variables with comma-separated STAFFIDs:
  - `ROLE_UNIVERSITY_ADMINS` → `universityAdmin`
  - `ROLE_DEPT_ADMINS` → `deptAdmin`
  - anyone else → `user`
- `resolveUserLevel(token)` maps the token to a tier.
- The role toggle in the profile menu switches the *viewed* role with `useRole()`. It is clamped to the real
  role, so it can lower the view but never raise it.

Keep the STAFFID lists in the environment, not in the code. They are identifiers, not secrets, but they
still describe who has admin rights.

## 5. Demo role simulator

The simulator lets a presenter sign in as a fictional persona without ERP. It is for demos and for
checking what each role sees. It is not a login method for real users.

How it works:

1. `DEMO_MODE=true` (server) and `NEXT_PUBLIC_DEMO_MODE=true` (client) turn it on. Both are off by default.
2. The `/demo` page lists the personas from `demoPersonas` (derived from `src/configs/roles.ts`).
3. Choosing a persona calls `POST /api/demo/session` with `{ personaId }`. The server mints a NextAuth-format
   JWT with `demo: true`, a role, and fictional user data, and sets it as the session cookie (max age 8 hours).
4. Choosing `guest` clears the cookie. `DELETE /api/demo/session` also clears it.
5. When `DEMO_MODE` is off, the endpoints return 404, and a demo token resolves to `public`.
6. A banner marks the session as a demo while it is active.

Rules:

- Personas are fictional. Never use real people's names, IDs, or data.
- Each demo session gets its own random STAFFID suffix (`DEMO-001-ab12cd34`), so visitors do not share an identity; anything they create under `DEMO_MODE` is still stored in the same shared demo data and is visible to other demo visitors with the same access.
- Never enable `DEMO_MODE` on real production.

How to present it:

1. Open the demo deployment (not production) and go to `/demo`.
2. Start as `guest` to show the public home and what anonymous visitors see.
3. Pick `user`, then `deptAdmin`, then `universityAdmin`. After each switch, show which menu items and
   pages appear and which return the 401 "auth required" page.
4. Point out that the role comes from the same rules as real users, but the data is fictional.
5. Clear the session (choose `guest`) at the end.
