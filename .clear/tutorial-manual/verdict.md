# Verdict: tutorial-manual (independent verifier)

Date: 2026-09-23. Verifier did not write the code. Evidence was re-run, not taken from worker-notes.

| SC | Result | Evidence |
|---|---|---|
| SC1 auto-start once, replay button | PASS (code review) | PageTour.tsx: auto-start when `!wasSeen`, and `markSeen` on close. The `?` button calls `start`. Not re-driven in a browser. One nuance: `markSeen` runs only on close, so a reload in the middle of the tour replays it (acceptable). |
| SC2 missing target skipped, keyboard, Esc | PASS (code review) / a11y PARTIAL | `start` filters out steps whose target is missing, and Esc/arrows are wired. See the a11y notes below. |
| SC3 capture | PASS | `pnpm manual:capture` exit 0, 8 PNG = 6+2 steps, manual.pdf 790 KB. Known-bad `NEXTAUTH_SECRET=wrong` gives "login failed ... NEXTAUTH_SECRET must match" and exit 1. The old PNGs were kept. |
| SC4 /manual + auth | PARTIAL | /manual/ without a cookie returns 307 to login. With a cookie it returns 200, both page titles are present, and all 8 shot URLs are there. BUT the generated files under /digitalplan/manual/*.pdf, *.mp4 and *.png return 200 with no login (the middleware matcher excludes `.*\..*`). |
| SC5 video | PASS | 2 MP4s, each with video, audio and subtitle streams. Audio vs video: 39.94/39.92 and 13.82/13.80 (within 1 s). VTT cues 6 and 2 equal the step counts. Narration: edge. |
| SC6 ElevenLabs switch | PASS | `ELEVENLABS_API_KEY=bad` gives "narration: elevenlabs" and an ElevenLabs auth error. It is a 400 invalid_api_key_prefix, not the 401 the plan expected, but the switch is still shown. |
| SC7 one file + two commands | PASS | docs/manual.md, CLAUDE.md, and add-page SKILL Step 3 all describe the one entry in src/data/help plus `manual:capture` / `manual:video`. Adding `data-tour` attrs to the page is also needed, and the docs mention it. |

tsc --noEmit: clean. lint: clean.

## Bugs / risks
1. MEDIUM, security: public/manual assets bypass auth (middleware matcher `src/middleware.ts:53` skips any path with a dot). The PDF, PNGs and MP4s can be fetched anonymously if they are deployed. They are demo data only, but the "access follows existing rules" part of SC4 does not hold for the assets. docs/manual.md should state this, or serve the assets through an authed route.
2. LOW, a11y: PageTour.tsx card has `aria-modal='true'`, but there is no focus trap, the page stays interactive, and focus is not returned to the trigger on close.
3. LOW, a11y: the ArrowLeft/ArrowRight handlers are global on window, so they hijack arrow keys in inputs while the tour is open.
4. INFO: the /manual page takes no user input. Slugs come from static helpByPage, so there is no path traversal. Script `rm` calls are limited to `public/manual/<slug>` and an mkdtemp work dir.

## Re-verification of fixes (2026-09-23)

| Finding | Result | Evidence |
|---|---|---|
| 1. Assets behind auth | FIXED | public/manual is gone. data/manual is ignored via `/data/*` (git check-ignore). /api/manual without a cookie returns 401. With a cookie: pdf 200 application/pdf, vtt 200 text/vtt, png 200, mp4 `Range: bytes=0-99` returns 206 with 100 bytes. Traversal attempts return 400 (`../`), 404 (`%2e%2e`) and 404 (`..%2f`). /manual lists 13 /api/manual URLs (8 png, 2 mp4, 2 vtt, 1 pdf). The old URL /manual/manual.pdf returns only the app HTML shell, no file. docs/manual.md describes data/manual, MANUAL_DIR and deploy copying. |
| 2. aria-modal / focus return | FIXED | There is no aria-modal in PageTour.tsx, and `buttonRef.current?.focus()` runs on close (line 71). |
| 3. Arrow keys in fields | FIXED | PageTour.tsx:121 ignores non-Escape keys inside input/textarea/select/[contenteditable="true"]. Nit: `contenteditable=""` or `plaintext-only` are not matched. `el.isContentEditable` would cover them. Very low severity. |

tsc --noEmit: clean. lint: clean. Overall: SC4 is now PASS, and the SC2 a11y part is PASS.
