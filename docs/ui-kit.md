# UI kit

Shared MUI building blocks in `src/components/kit/` (import from `@/components/kit`). No extra UI
library. The reference page that uses all of them is `/requests` (`src/views/requests/Requests.tsx`).

| Component | Use it for | Notes |
| :-- | :-- | :-- |
| `DataTable` | Any list | Pagination, click-to-sort headers, cards below the `sm` breakpoint, built-in loading/error/empty states. Pass already-filtered `rows` and `resetKey={JSON.stringify(filters)}` so a new filter goes back to page 1 while sort and page size stay. `hideOnMobile` keeps cards short. |
| `FilterBar` | The one filter per page | Configure `fields` (`search`, `select`, `text`, `date`). The first 4 show inline, the rest go under "ตัวกรองเพิ่มเติม". Values are controlled by the page. |
| `FormDialog` | Create / edit | Field list with `required` and `validate`. Errors show on blur and while typing. Enter submits and Esc closes; unsaved changes ask first. With `draftKey`, input is kept in localStorage and restored, with a clear button. `onSubmit` throws to keep the dialog open. Full screen on phones. |
| `ConfirmDialog` | Delete, reject, anything irreversible | `color='error'` by default; `confirmDisabled` blocks confirming until, e.g., a reason is typed. |
| `EmptyState`, `ErrorState`, `TableSkeleton` | Loading / nothing / failure | Always give the next action (a create button, a retry). |
| `notifySuccess`, `notifyError` | Feedback after every action | react-toastify; the container is mounted in `ClientProviders.tsx`. Pass the error so the reason is shown. |
| `PrintReport` | Printable Thai report / PDF | Hidden on screen. When printing, only the report is shown (A4, Sarabun, table header repeats on each page). Use a button that calls `window.print()`; "Save as PDF" in the print dialog gives the PDF. |

## Export

`downloadXLSX(rows, columns, filename)` in `src/libs/export/xlsx.ts` writes a real `.xlsx` with no
dependency: one sheet, a frozen header row, inline UTF-8 strings (so Thai is correct), and numbers
kept numeric. `buildXLSX` returns the bytes and also works on the server. If you need styling,
formulas or several sheets, switch that page to a library such as exceljs.

Pick one export strategy per page: Excel for data people will work with, `PrintReport` for a
document people will sign or file. `/requests` shows both only because it is the demo.

## Approval workflow (`/requests`)

- Status machine: `draft → submitted → approved | rejected`, defined in `src/services/requestTypes.ts`
  (`transitions`). The detail dialog shows it as an MUI Stepper with the history underneath.
- The requester edits and submits their own drafts. Approve and reject need `deptAdmin` or higher
  (`canApprove` in `src/services/requests.ts`), and the API checks this again. Reject needs a reason.
- Storage: `data/requests.json` (gitignored; shape in `data/requests.example.json`). To move to the
  real backend, reimplement the four exported functions in `src/services/requests.ts`. The routes
  under `src/app/api/requests/` and the page do not change.
- Notifications: every status change calls `notify()` from `src/libs/notify.ts`. It does nothing
  until you set the LINE or SMTP keys in `.env` (listed in `.env.example`). Email also needs
  `pnpm add nodemailer`. Errors are logged and never block the action.
