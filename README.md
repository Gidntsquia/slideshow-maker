# Slideshow Maker

Drag a folder of images onto the page, get `<folder>.pptx`: one image per 16:9 slide, black background, image fit whole and centered, 2 s Wipe-from-right, auto-advance after 5 s (click also works). Runs fully in the browser; nothing is uploaded.

## Run
```
bun install
bun run dev        # http://localhost:5173
bun run build      # static copy in dist/ (serve with any static server, or bun run preview)
```
Use Chrome or Edge. JPEG/PNG/GIF/BMP are embedded untouched; HEIC/WebP are converted to JPEG (q 0.95); EXIF rotation is applied as a slide rotation, not a re-encode.
