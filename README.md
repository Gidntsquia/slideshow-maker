# Slideshow Maker

Drop a folder of photos, check them, and download a PowerPoint slideshow (and optionally an MP4). Runs fully in the browser; nothing is uploaded. Use Chrome or Edge.

## Run
```
bun install
bun run dev        # http://localhost:5173
bun run build      # static copy in dist/ (serve with any static server, or bun run preview)
```

## How it works
1. **Drop** a folder (or "or choose a folder"). Nothing is built or downloaded yet.
2. **Review** the thumbnail grid in slide order. ✕ removes a photo (click it again to restore), drag to reorder, click to see it large exactly as it will sit on the slide (←/→ move, Esc closes). Skipped files are listed underneath.
3. **Create slideshow**, then **Download**. Files are only saved when you click Download. Changing anything afterwards marks the result out of date until you Create again.

Defaults give the same .pptx as before: 16:9, black background, fit whole, Wipe from right 2 s, advance after 5 s, click also advances.

## Settings (saved in the browser; "Reset to defaults" restores them)
- **Transition**: None, Fade, Wipe, Push, Cover, Uncover, Split, Dissolve, Random Bars, Blinds, Checkerboard, Shape (circle), Zoom, or Random (one effect per slide, same in the .pptx and the video). Direction where the effect has one. Time 0.25–10 s.
- **Timing**: 1–60 s per slide; "Advance automatically" off = click only.
- **Picture**: Fit whole / Fill and crop, background (black, white, custom), slide shape (16:9, 4:3, 9:16), caption (off, file name, date taken).
- **Photo order**: name (like Explorer), date taken oldest/newest (EXIF, else file date), shuffle. Choosing one after a manual reorder asks first.
- **Self-running show**: saves `<folder>.ppsx`, which opens full screen, plays on its timings and loops until Esc.
- **Also make a video (MP4)**: `<folder>.mp4`, 1080p (scaled to the slide shape), 30 fps H.264, no audio, same photos/order/transitions. Needs a browser with an H.264 encoder (WebCodecs); otherwise the option is disabled. Progress and Cancel are shown; Cancel keeps the PowerPoint.

JPEG/PNG/GIF/BMP are embedded untouched; HEIC/WebP are converted to JPEG (q 0.95); EXIF rotation is applied as a slide rotation, not a re-encode.
