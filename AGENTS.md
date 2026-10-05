# Notes
- Bun + Vite + React + TS + Tailwind v4. Client-only; .pptx is hand-built in `src/lib/pptx.ts` with fflate (streamed, stored).
- `plans/` is gitignored. Test harness lives outside the repo (Playwright + python-pptx via uv).
- Video: mp4-muxer + WebCodecs in src/lib/video.ts; settings in localStorage `slideshow-maker.settings.v1`.
