# Template essentials: plan and checklist

Goal: give every MSU system cloned from this template the pieces it would otherwise rebuild.
Scope was approved by the owner ("ทำทั้งหมดเลย"). The integration branch is `feat/template-essentials`.

## Workstreams

The streams run in parallel, each in its own worktree and branch, and are merged into the integration branch.

| Stream | Owner | Tasks |
|---|---|---|
| 0. Tour setting | lead | T0 |
| A. UI kit, export, approval demo | agent A | T1, T2, T3 |
| B. Server features | agent B | T4, T5 |
| C. Quality and tooling | agent C | T6, T7, T8 |
| Verify | independent verifier | T9 |

## Checklist

- [x] T0 Tour auto-play setting: `themeConfig.tourAutoStart` plus `NEXT_PUBLIC_TOUR_AUTOSTART=false`; documented in docs/manual.md.
- [x] T1 Shared UI kit in `src/components/kit/`:
  - DataTable with pagination; sort, filter and search state survive paging; collapses to cards on mobile.
  - FilterBar: one shared component, with fields configured per page.
  - FormDialog: inline validation, confirm before discarding unsaved changes, localStorage draft plus a clear button, Esc and Enter.
  - ConfirmDialog for destructive actions.
  - EmptyState, ErrorState and a loading skeleton.
- [x] T2 Export: `downloadXLSX` and a printable Thai PDF report (print CSS). One strategy per page.
- [x] T3 Approval workflow demo (`/requests`), built on T1 and T2:
  - Status machine with a stepper.
  - Notification hook (email over SMTP and/or LINE Messaging API, off when not configured).
  - Help entry for the page.
- [x] T4 Audit log:
  - `audit()` helper that records who, what, when and a before/after diff.
  - Append-only JSONL under `data/`.
  - Admin page to browse it.
  - Wired into the MCP write actions.
- [x] T5 File upload:
  - Authenticated upload API that checks type and size and stores files under `data/uploads`.
  - Authenticated download route.
  - Upload component.
- [x] T6 CI: GitHub Actions runs tsc, lint and build on every PR, plus Playwright smoke tests (login redirect, basePath, key pages).
- [x] T7 Fix: an anonymous visitor redirected to /login ends up at `/home/` without the basePath.
- [x] T8 Tooling and cleanup:
  - `npm run init` asks for the system name, basePath and secrets, and rewrites the ⚠️ rename spots.
  - Untrack `mui-template.tar.gz` and ignore build tarballs.
- [x] T9 Independent verification, then PR, merge (keep branches), handoff note.
