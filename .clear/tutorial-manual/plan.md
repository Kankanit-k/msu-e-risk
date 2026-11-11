# Plan: tutorial, manual, and video

A PRD is folded in here because the URD already fixes the scope.

## Design decisions
- **Tour**: a small MUI component we write ourselves (Popper plus a spotlight box). No tour library dependency.
  - Content comes from `helpByPage[pathname]`.
  - "Seen" state lives in localStorage under the key `<cookie-prefix>-tour-seen:<path>` (namespaced per system). If storage is unavailable, the tour still works but does not auto-start.
  - A step whose target is missing is shown centered if it has no target; if it has a target that is missing, it is skipped.
  - Buttons are ถัดไป / ย้อนกลับ / ข้าม. Esc closes; the arrow keys move between steps.
  - Stable hooks for scripts: `data-tour-next` / `data-tour-close`.
- **Targets**: `data-tour="..."` attributes on the shell (sidebar, chat button, profile, tour button) and on example pages.
- **/manual**: a server page (login required) that reads `helpByPage` and shows `public/manual/<slug>/<n>.png` when the file exists.
  - Video goes in a `<video>` with a `<track>` (VTT) when `public/manual/video/<slug>.mp4` exists.
  - The "ดาวน์โหลด PDF" link points to `public/manual/manual.pdf` if it exists; otherwise the button runs `window.print()`.
  - There is a print stylesheet.
- **Scripts** (Node ESM, `scripts/manual/`). They run against a running server and log in by minting a next-auth cookie from `NEXTAUTH_SECRET` with a demo user.
  - `capture.mjs`: opens each page, clears the seen flag, starts the tour, takes a screenshot per step, then saves `/manual/` as a PDF.
  - `video.mjs`: synthesizes the TTS for each step first to get its duration, records the tour with Playwright video at that pace, then uses ffmpeg to combine the webm with the concatenated audio into an MP4, alongside `.vtt` subtitles.
  - `tts.mjs`: providers are `edge` (the `msedge-tts` package, voice `th-TH-PremwadeeNeural`, no key) and `elevenlabs` (used automatically when `ELEVENLABS_API_KEY` is set). The provider can also be forced with `MANUAL_TTS`.
- Generated output in `public/manual/` is gitignored.

## Task graph
Everything runs in sequence in one domain, so there are no worker agents. An independent verifier and a security check run at the end.

- [x] T1 help data: steps for `/home` and `/connections`, plus `data-tour` attributes
- [x] T2 Tour component and navbar button (vertical and horizontal), with auto-start on the first visit
- [x] T3 `/manual` page, print CSS, and a sidebar/profile menu entry
- [x] T4 `scripts/manual/{session,capture}.mjs`, plus the `manual:capture` script in package.json
- [x] T5 `scripts/manual/{tts,video}.mjs`, plus the `manual:video` script
- [x] T6 docs (`docs/manual.md`), `add-page` skill note, CLAUDE.md rule, `.env.example`, `.gitignore`
- [x] T7 verification: criteria checks, a browser check, lint/tsc/build, the independent verifier
- [x] T8 PR, merge (keep the branch), handoff

## Criteria: how each SC is checked, and the known-bad input
- SC1: in the browser, clear localStorage and open /home, and the tour dialog should appear. Reload, and there should be no dialog. Click the button, and the dialog should appear. *Known-bad*: before T2 there is no dialog.
- SC2: add a step with a target that doesn't exist, run the tour, and it should skip that step with no console error; Esc should close it. *Known-bad*: a nonexistent target with no guard throws.
- SC3: `pnpm manual:capture` exits 0; the PNG count equals the number of steps and `manual.pdf` is more than 10 KB. *Known-bad*: with a wrong `NEXTAUTH_SECRET`, it fails with a login error.
- SC4: `curl /manual/` without a cookie returns a redirect to login; with the cookie it returns 200 and contains every page title. *Known-bad*: without the cookie there is no content.
- SC5: `pnpm manual:video` produces an MP4 per page. ffprobe shows both an audio and a video stream, the audio duration is within 1 s of the video duration, and the VTT cue count equals the step count. *Known-bad*: with `MANUAL_TTS=none`, there is no audio stream, so the check fails.
- SC6: with `ELEVENLABS_API_KEY=bad` the provider is ElevenLabs and the script errors out with an ElevenLabs 401. That proves the switch without spending quota.
- SC7: the docs show a one-file edit followed by two commands.
