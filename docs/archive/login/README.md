# Archived login page

The system's own login form is archived here. It is no longer part of the application.

## Why it was archived

- Sign-in is handled only by ERP OAuth (erp.msu.ac.th). A local username/password form is not used.
- Sign-in starts only when the user chooses **เข้าสู่ระบบด้วย ERP มมส** from the profile menu in the top-right corner.
- Nothing redirects anonymous visitors to a login page. Protected pages are answered with HTTP 401 and rewritten to the `/auth-required` notice.
- The `/login` URL is redirected to `/` in `next.config.ts`.

## Files

| Archived file | Original location |
| :-- | :-- |
| `page.tsx.txt` | `src/app/(blank-layout-pages)/login/page.tsx` |
| `Login.tsx.txt` | `src/views/Login.tsx` |

The files are stored with a `.txt` suffix so that the Next.js and TypeScript build ignores them.

## How to restore

1. Rename `page.tsx.txt` to `page.tsx` and place it at `src/app/(blank-layout-pages)/login/page.tsx`.
2. Rename `Login.tsx.txt` to `Login.tsx` and place it at `src/views/Login.tsx`.
3. Remove the `/login` redirect from the `redirects()` block in `next.config.ts`.
4. Add `/login` back to `publicRoutes` in `src/configs/accessControl.ts`.
5. Review the restored form against the current ERP-only sign-in flow before enabling it.
