# In-app tour, manual, and video manual

One help entry per page in `src/data/help/index.ts` drives four outputs:

| Output | Where | How it's produced |
| :-- | :-- | :-- |
| In-app tour | `?` button in the navbar; plays automatically the first time a user opens the page | `src/components/tour/PageTour.tsx`, live |
| Manual page | `/manual/` (profile menu → คู่มือการใช้งาน), login required | reads the help data + generated images at request time |
| Screenshots + PDF | `data/manual/<page>/<n>.png`, `data/manual/manual.pdf` | `pnpm manual:capture` |
| Video manual | `data/manual/video/<page>.mp4` + `.vtt`, played on `/manual/` | `pnpm manual:video` |
| Chatbot answers | `get_help` MCP tool | same data |

## Add help for a page (one file)

```ts
// src/data/help/index.ts
'/requests': {
  title: 'คำขอของฉัน',
  summary: 'ดูและยื่นคำขอใหม่',
  steps: [
    { target: '[data-tour="new-request"]', title: 'ยื่นคำขอใหม่', body: 'กดปุ่มนี้เพื่อกรอกแบบฟอร์มคำขอ' },
    { title: 'เสร็จแล้ว', body: 'ขั้นที่ไม่มี target จะแสดงกลางจอ' }
  ]
}
```

Then mark the element: `<Button data-tour='new-request'>`. Keep each `body` to 1–2 sentences;
it is also read aloud in the video. A step whose target is not on screen (hidden by role, a
different layout) is skipped, not an error. Shared shell steps (sidebar, AI assistant, profile,
tour button) are in the `shell` array. Spread them into a page if you want them.

## Turning off auto-play

By default, a page's tour plays once on the first visit. To stop that and keep only the ? button, do one of these:

- Set `tourAutoStart: false` in `src/configs/themeConfig.ts` (applies to the whole system).
- Set `NEXT_PUBLIC_TOUR_AUTOSTART=false` in the env for one deployment. It is read at build time.

## Interactive steps (opt-in)

By default every step is passive: the user reads it and presses ถัดไป or ข้าม. A system that wants
a "learn by doing" tour can mark individual steps with `waitFor`:

```ts
{ target: '[data-tour="new-request"]', title: 'ยื่นคำขอใหม่', body: 'กดปุ่มนี้เพื่อเปิดแบบฟอร์ม', waitFor: 'click' },
{ target: '[data-tour="request-title"] input', title: 'ตั้งชื่อคำขอ', body: 'พิมพ์ชื่อคำขอ', waitFor: 'input' }
```

- `click`: the step advances when the user clicks the target.
- `input`: the step advances on the target's `change` event with a non-empty value, so `target` must be the `input`, `textarea` or `select` itself, not its wrapper.
- On these steps ถัดไป is hidden, → is ignored, and clicks outside the target are blocked. ข้าม, ย้อนกลับ and Esc still work, so the user is never trapped.
- If the target is missing, the step falls back to a normal passive step.
- `npm run manual:capture` and `manual:video` perform the action themselves: they click the target, or fill it with `ตัวอย่าง`. Point interactive steps only at actions that are safe to run against the demo account, such as opening a form. Never point one at a submit or delete button.

## Regenerate illustrations (two commands)

With the app running (`pnpm dev`, auth enabled — `AUTH_DISABLED=false`):

```bash
pnpm manual:capture   # screenshots per step + manual.pdf
pnpm manual:video     # MP4 per page with Thai narration + subtitles
```

- The scripts log in as a **demo user** by minting a session with `NEXTAUTH_SECRET` (read from
  `.env.local`). It must match the running server. Point at another server with `MANUAL_BASE_URL`.
- Requirements: Playwright's Chromium (`pnpm exec playwright install chromium`, once) and
  `ffmpeg` on PATH (video only). Run them on a dev machine, not the production server.
- `/manual/` picks up new files immediately. No rebuild is needed.

## Narration (TTS)

| `MANUAL_TTS` | Voice | Needs |
| :-- | :-- | :-- |
| `edge` (default) | `th-TH-PremwadeeNeural` (`MANUAL_TTS_VOICE`, e.g. `th-TH-NiwatNeural`) | nothing. Free, but an unofficial endpoint that may stop working |
| `elevenlabs` | `ELEVENLABS_VOICE_ID`, model `eleven_multilingual_v2` | `ELEVENLABS_API_KEY`. Chosen automatically when the key is set |
| `none` | no audio, subtitles only | — |

Narration is generated first; the recording then holds each step for as long as its line takes,
so audio, highlight, and subtitle stay in sync.

## Committing the output

Generated files live in `data/manual/` (override with `MANUAL_DIR`), not `public/`. Everything
in `public/` is readable without login, but these files are served by `/api/manual/*`, which requires a
session, like `/manual/` itself. `data/` is gitignored because generated binaries bloat the repo.
To ship the files, copy `data/manual/` to the server next to the app (standalone: the working
directory of `server.js`), or run the two commands there.

## PDPA

Screenshots and videos show whatever is on screen. Capture only with the demo user and
demo/seed data, never against production data. Review the output before publishing it.
