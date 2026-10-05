# Settings

Settings are saved in the browser (localStorage `slideshow-maker.settings.v1`, see `src/lib/settings.ts`); "Reset to defaults" restores them.

- **Transition**: None, Fade, Wipe, Push, Cover, Uncover, Split, Dissolve, Random Bars, Blinds, Checkerboard, Shape (circle), Zoom, or Random (one effect per slide, same in the .pptx and the video). Direction where the effect has one. Time 0.25–10 s.
- **Timing**: 1–60 s per slide; "Advance automatically" off = click only.
- **Picture**: Fit whole / Fill and crop, background (black, white, custom), slide shape (16:9, 4:3, 9:16), caption (off, file name, date taken).
- **Photo order**: name (like Explorer), date taken oldest/newest (EXIF, else file date), shuffle. Choosing one after a manual reorder asks first.
- **Self-running show**: saves `<folder>.ppsx`, which opens full screen, plays on its timings and loops until Esc.
- **Also make a video (MP4)**: `<folder>.mp4`, 1080p (scaled to the slide shape), 30 fps H.264, no audio, same photos/order/transitions. Needs a browser with an H.264 encoder (WebCodecs); otherwise the option is disabled. Progress and Cancel are shown; Cancel keeps the PowerPoint.

## Image formats

JPEG/PNG/GIF/BMP are embedded untouched; HEIC/WebP are converted to JPEG (q 0.95); EXIF rotation is applied as a slide rotation, not a re-encode.
