# Slideshow Maker 🖼️

<!-- TODO: screenshot of the review grid with a folder of photos loaded (docs/review.png) -->

Turns a folder of photos into a PowerPoint slideshow, and optionally an MP4 video of the same show.
You drop a folder, check the photos in a thumbnail grid, and download the .pptx. Everything runs
in the browser and no photos are uploaded anywhere. Built with React, Vite and
[fflate](https://github.com/101arrowz/fflate); the video is encoded with WebCodecs and
[mp4-muxer](https://github.com/Vanilagy/mp4-muxer).

## Quickstart 🚀

Requires [Bun](https://bun.sh) and Chrome or Edge.

```
git clone https://github.com/Gidntsquia/slideshow-maker
cd slideshow-maker
bun install
bun run dev        # Open http://localhost:5173
```

Drop a folder of photos on the page, remove or reorder anything in the grid, then click
Create slideshow and Download. Nothing is saved to disk until you click Download.

Other commands:

```
bun run build      # Static copy in dist/, serve it with any static server
bun run preview    # Serves dist/ locally
uv run --with pillow scripts/make_testdata.py testdata/EvalTrip 9   # Makes a folder of test photos
```

## Features 🔬

- Photos are shown in slide order. You can drag to reorder, remove a photo with ✕, and click one to see it as it will look on the slide.
- 12 transitions plus a Random option. Each has an adjustable length, and most have a direction.
- Slides advance on a timer, on click, or both.
- Photos can fit inside the slide or fill and crop it, on a black, white or custom background, in 16:9, 4:3 or 9:16.
- Optional captions with the file name or the date the photo was taken.
- Sorts by file name, date taken (from EXIF), or shuffles.
- Can save a self-running .ppsx that opens full screen and loops.
- Can also export a 1080p MP4 with the same photos and transitions.
- JPEG, PNG, GIF and BMP files go into the .pptx unchanged. HEIC and WebP are converted to JPEG.
- Settings are remembered between visits.

## Documentation 📚

More details in [docs/](docs):

- [Using the App](docs/Using-the-App.md) — drop, review, create, download steps
- [Settings](docs/Settings.md) — every option and image format handling

## License 📄

[MIT](LICENSE).
