# Handoff: template essentials

## State
Merged to main through the PR "Template essentials". Every item in `plan.md` is checked.

## What's in it
- **Tour auto-play setting:** `themeConfig.tourAutoStart`, overridable with `NEXT_PUBLIC_TOUR_AUTOSTART=false`.
- **UI kit:** `src/components/kit/` (DataTable, FilterBar, FormDialog, ConfirmDialog, empty, error and loading states, PrintReport). See docs/ui-kit.md.
- **Export:** `src/libs/export/xlsx.ts`, a zero-dependency xlsx writer.
- **`/requests` demo:** approval workflow with a stepper and notifications (`src/libs/notify.ts`: LINE and SMTP, off until configured). Storage is a JSON file; swap `src/services/requests.ts` for the real backend.
- **Audit log:** `src/libs/audit.ts`, browsable at `/admin/audit`. It records MCP writes, request actions, uploads, and downloads by someone other than the owner.
- **Uploads:** `/api/files` checks magic bytes, a size limit and ownership. Component: `src/components/upload/FileUpload.tsx`. See docs/audit-and-uploads.md.
- **CI and tests:** `.github/workflows/ci.yml` runs tsc, lint, build and Playwright smoke tests (`tests/smoke.spec.ts`).
- **Redirect fix:** the middleware's login callbackUrl now keeps the basePath.
- **`npm run init`:** renames the system and sets the basePath, port and `.env.local`.

## Open items
- CI has not run on GitHub yet. Watch the first PR run.
- `FileUpload` has not been clicked through in a browser, because no page uses it yet. Wiring it into `/requests` as attachments is the obvious next step.
- Email needs `pnpm add nodemailer` before SMTP works. No real LINE or SMTP send has been tested.
- `input` interactive tour steps do not fire for MUI Select or Autocomplete.
