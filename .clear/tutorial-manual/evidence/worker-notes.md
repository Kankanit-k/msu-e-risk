# Worker evidence (author's own runs — not the verdict)
- manual:capture → 8 screenshots (home 6/6, connections 2/2) + manual.pdf 790 KB
- manual:video (edge) → home.mp4 video 41.52s / audio 41.56s, 6 cues; connections.mp4 13.84/13.82s, 2 cues
- MANUAL_TTS=none → connections.mp4 streams: video, subtitle (no audio) = known-bad for SC5
- ELEVENLABS_API_KEY=bad → "narration: elevenlabs", ElevenLabs error thrown (SC6)
- NEXTAUTH_SECRET=wrong → "login failed ... rejected the demo session", old screenshots kept (SC3 known-bad)
- curl /manual/ no cookie → 307 to /digitalplan/login/ (SC4)
- Browser: auto-start on first visit; Esc closes + marks seen; reload no auto-start; button restarts;
  removed quick-links target → "1 / 5", help-index 0→2 (skip); card focused; arrow keys work (SC1, SC2)
- /manual in browser: 8 images none broken, 2 videos, 2 tracks, PDF link
- tsc, lint, next build clean
