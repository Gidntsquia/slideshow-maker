# Makes ~/Desktop-friendly test folders. Usage: uv run --with pillow scripts/make_testdata.py [outdir] [count]
import os, sys
from PIL import Image, ImageDraw
out = sys.argv[1] if len(sys.argv) > 1 else "testdata/EvalTrip"
count = int(sys.argv[2]) if len(sys.argv) > 2 else 9
os.makedirs(out, exist_ok=True)
kinds = [("landscape", 1600, 1000), ("portrait", 1000, 1600), ("panorama", 3200, 800), ("square", 1200, 1200)]
for i in range(count):
    k, w, h = kinds[i % 4]
    name = f"{i+1:02d} {k}"
    im = Image.new("RGB", (w, h), ((i * 47) % 200 + 30, (i * 83) % 200 + 30, (i * 29) % 200 + 30))
    d = ImageDraw.Draw(im); d.rectangle([10, 10, w - 10, h - 10], outline="white", width=8)
    d.text((40, 40), name, fill="white", font_size=min(w, h) // 6)
    im.save(os.path.join(out, name + ".jpg"), quality=90)
open(os.path.join(out, "notes.txt"), "w").write("not an image")
print("wrote", count, "photos +notes.txt to", out)
