# Audit log and file uploads

## Audit log

`src/libs/audit.ts`:

```ts
import { audit } from '@/libs/audit'

await audit({ actor: caller.userId, action: 'request.approve', target: req.id, before: old, after: updated })
```

- Appends one JSON line to `AUDIT_DIR/YYYY-MM.jsonl` (default `data/audit`, gitignored). One file per month.
- Stores only the changed fields: `diff: { field: [before, after] }`. Omit `before` for a create,
  omit both for an event with no data (for example a download).
- Fields whose name looks secret (`password`, `token`, `secret`, `apiKey`, `authorization`, `cookie`,
  `credential`, `otp`, `pin`, `private…`) are stored as `[redacted]`. Strings are cut at 500 characters.
- It never throws. A failed write goes to the logger (`audit write failed`) and the caller carries on.
- Wired in: MCP write actions when a human confirms them (`mcp.<tool>` / `mcp.<tool>.failed`, target = action id),
  file uploads (`file.upload`), and downloads by someone other than the owner (`file.download`).

Browse it at `/admin/audit` (deptAdmin and up; the page checks the role itself as well as middleware).
Filter by month, actor and action; filters stay in the URL, so paging keeps them.

The file is append-only by convention: the app never rewrites it. For tamper evidence in production,
ship the directory to central log storage or make it append-only at the OS level (`chattr +a`).

## File uploads

| Route | Auth | Does |
| :-- | :-- | :-- |
| `POST /api/files/` | session + same origin | multipart field `file` → `201 { id, name, type, size }` |
| `GET /api/files/<id>/` | session; owner or deptAdmin+ | the file as an attachment |

Checks on upload:

- Allowlist by extension **and** magic bytes: `pdf png jpg jpeg webp docx xlsx`. A renamed `.exe` → `415`.
  (`docx`/`xlsx` are checked as ZIP containers only.)
- Size limit `UPLOAD_MAX_MB` (default 10) → `413`. Set the reverse proxy body limit to match
  (nginx `client_max_body_size`), since the request is read into memory.
- 30 uploads per user per minute → `429`.
- Stored as `UPLOAD_DIR/<32 hex id>` plus `<id>.json` (owner, original name, type, size). The id is random,
  and the download route accepts only that format, so no path can be built from user input.

Downloads are always sent with `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`,
`Content-Security-Policy: default-src 'none'; sandbox` and `Cache-Control: private, no-store`.
Others' files → `403`; unknown or malformed ids → `404`; no session → `401`.

### Component

```tsx
import FileUpload, { fileUrl } from '@/components/upload/FileUpload'

<FileUpload onUploaded={f => setValue('attachmentId', f.id)} />
<a href={fileUrl(id)}>ดาวน์โหลด</a>
```

Store the returned `id` on your own record. There is no listing or delete endpoint; add one in your
system with its own permission check and an `audit()` call.

## Environment

| Key | Default | |
| :-- | :-- | :-- |
| `AUDIT_DIR` | `data/audit` | audit JSONL directory |
| `UPLOAD_DIR` | `data/uploads` | uploaded files |
| `UPLOAD_MAX_MB` | `10` | max file size |

Back up both directories; they are not in git.
