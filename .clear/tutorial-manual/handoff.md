# Handoff: in-app tour, manual, and video manual (2026-09-23)

## State
Done on `feat/tutorial-manual`. A single help source, `src/data/help`, drives four outputs:
- the tour (navbar `?` button; it auto-plays the first time a user visits a page),
- `/manual`, which requires login,
- the screenshots and PDF from `pnpm manual:capture`,
- the MP4 with Thai TTS narration and VTT subtitles from `pnpm manual:video` (Edge TTS by default, ElevenLabs when a key is set),
- plus the chatbot's `get_help`.

Generated files live in `data/manual` and are served behind login by `/api/manual/*`.
Independent verifier: all SC1–SC7 PASS (`verdict.md`). SC1 and SC2 were also checked in a real browser by the author.

## Not verified
- ElevenLabs with a real key (only the switch and the failing-auth path were tested).
- The horizontal layout tour (the sidebar step should be skipped there; that is by design, but it wasn't run).
- Deploy flow for `data/manual` on the production server.

## Next
- Add help entries for real pages in each cloned system.
- Pre-existing issue: an anonymous visitor bounced to `/login` later ends up at `/home/` without the basePath (client-side). Investigate separately.
- Warning for other clones: pulling main after PR #4 deletes the local `.env.local` and `.env.production`. Back them up first, or restore them with `git show <commit-before-untrack>:.env.local`.
