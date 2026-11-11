---
name: add-page
description: Scaffold a new authenticated page in this Next.js + MUI template and register it in the sidebar/top menu. Use when the user wants to add a page, route, screen, or menu item to the MSU starter-kit template.
---

# Add a page to the MSU starter-kit template

This template is **data-driven**: pages are Next.js App Router routes, and the navigation is a
single data file. Adding a page is two steps — create the route, then register it in the menu.

## Conventions (read first)

- **Keep paths shallow — aim for ≤ 3 segments.** e.g. `/admin/manage-users`, `/api/test`.
  Avoid deep nesting like `/admin/users/manage/list`.
- **Group menu items by purpose.** Sidebar sections: `แดชบอร์ด` (dashboards), `ตาราง`
  (tables/lists), then admin sections. Add the new page to the matching section.
- **Pick the access tier** (enforced by `src/middleware.ts` via `src/configs/accessControl.ts`):
  - `user` (login) → default; any path under `(private)` that is not in `publicRoutes`.
  - `deptAdmin` (ผู้ดูแลหน่วยงาน) → put the page under `/admin/**` and in the `ผู้ดูแลหน่วยงาน` section.
  - `universityAdmin` (ผู้ดูแลมหาวิทยาลัย) → put it under `/admin/university/**` and in the
    `ผู้ดูแลมหาวิทยาลัย` section.
  - A route's tier comes from its prefix in `routeAccessRules`; unlisted paths default to `user`.
    The menu only *hides* links — middleware does the real enforcement. Full table: CLAUDE.md.
  - Add the page's feature to `permissionMatrix` in `src/configs/roles.ts` (role catalog; see `docs/roles.md`).
    If the page is public, also add its path to `publicRoutes` in `src/configs/accessControl.ts`.
  - Never add a sign-in redirect or `signIn()` call to a page. Anonymous visitors of a private page get the
    401 `/auth-required` page; login is only the profile menu item.

## Step 1 — Create the route

Create `src/app/(private)/<route>/page.tsx`. The `(private)` group applies the dashboard
layout (sidebar + navbar); access is decided by `src/middleware.ts`, not by the folder. Use this minimal, on-theme starting point:

```tsx
// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'

const <PascalCaseName>Page = () => {
  return (
    <Card>
      <CardHeader title='<หัวข้อ>' subheader='<คำอธิบาย>' />
      <CardContent>
        <Typography>เนื้อหาของหน้า…</Typography>
      </CardContent>
    </Card>
  )
}

export default <PascalCaseName>Page
```

Notes:
- Keep it a **server component** (no `'use client'`) unless you use hooks/state/effects/event
  handlers — then add `'use client'` at the top (see `src/app/(private)/users/page.tsx`).
- Nested routes are just nested folders, e.g. `dashboards/reports/page.tsx` → `/dashboards/reports`.
- For a richer example with cards/grid, copy `src/app/(private)/home/page.tsx`.

### Lists, forms and approvals — use the UI kit

Do not hand-build tables, filters or form modals. Use `src/components/kit` (docs: `docs/ui-kit.md`):
`DataTable` (paging, sort, mobile cards, empty/error/loading), `FilterBar` (the one filter component,
configured per page), `FormDialog` (inline validation, draft, confirm-on-discard), `ConfirmDialog`
for destructive actions, `PrintReport` + `downloadXLSX` (`src/libs/export/xlsx.ts`) for export, and
`notifySuccess`/`notifyError` toasts. The complete reference page is `/requests`
(`src/views/requests/`): list, create/edit, status stepper, admin-only approve.

### Tab title (required)

Give every page its own Thai name — the root layout adds `| MSU-<ABBR>` automatically:

```tsx
export const metadata = { title: '<ชื่อหน้า>' }
```

Client page (`'use client'`)? Export it from a sibling `layout.tsx` instead:

```tsx
import type { ChildrenType } from '@core/types'

export const metadata = { title: '<ชื่อหน้า>' }

const Layout = ({ children }: ChildrenType) => children

export default Layout
``` Never write the system name into a page title.

## Step 2 — Register it in the sidebar

Edit `src/data/navigation/verticalMenuData.tsx`. Add an **item** to the relevant section, or add
a new section. Shapes:

```tsx
// Link item
{ label: 'รายงาน', href: '/dashboards/reports', icon: 'ri-file-chart-line' }

// Expandable group (sub-menu)
{
  label: 'รายงาน',
  icon: 'ri-file-chart-line',
  suffix: { label: 'ใหม่', size: 'small', color: 'primary' }, // optional chip badge
  children: [
    { label: 'รายเดือน', href: '/reports/monthly' },
    { label: 'รายปี', href: '/reports/yearly' }
  ]
}

// Section heading (grey group label)
{ label: 'รายงาน', isSection: true, children: [ /* items / sub-menus */ ] }
```

- `icon` is a **Remix Icon** class (browse at https://remixicon.com), e.g. `ri-user-line`.
- If the project also uses the **horizontal** layout, mirror the entry in
  `src/data/navigation/horizontalMenuData.tsx` (it has no `isSection` — use items/sub-menus).

## Step 3 — Help steps (tour, manual, chatbot)

Add an entry to `src/data/help/index.ts` keyed by the route, and put `data-tour='...'` on the
elements the steps point at. That one entry drives the in-app tour, `/manual`, the generated
screenshots/video, and the chatbot's `get_help`. Steps are passive by default; add
`waitFor: 'click' | 'input'` only when the system wants a learn-by-doing step. Details: `docs/manual.md`.

```ts
'/requests': {
  title: 'คำขอของฉัน',
  summary: 'ดูและยื่นคำขอใหม่',
  steps: [{ target: '[data-tour="new-request"]', title: 'ยื่นคำขอใหม่', body: 'กดปุ่มนี้เพื่อกรอกแบบฟอร์มคำขอ' }]
}
```

## Step 4 — Verify

- `pnpm dev` and click the new menu item, **or** `pnpm lint` for a quick static check.
- Don't add a menu entry whose `href` has no `page.tsx` yet — it 404s.

## Reference
- Menu types: `src/types/menuTypes.ts`
- Menu renderer: `src/components/GenerateMenu.tsx`
- Sidebar styling: `src/@core/styles/vertical/{menuItemStyles,menuSectionStyles}.ts`
