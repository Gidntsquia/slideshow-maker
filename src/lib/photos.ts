import { jpegDate, jpegInfo } from "./imageinfo";
import { sortEntries, type Entry } from "./walk";
import type { Order } from "./settings";

export interface Photo { id: number; file: File; path: string; name: string; removed: boolean; dateMs: number }
export const IMG_EXT = new Set(["jpg", "jpeg", "png", "gif", "bmp", "heic", "heif", "webp"]);
export const extOf = (n: string) => (n.includes(".") ? n.split(".").pop()!.toLowerCase() : "");

export function toPhotos(entries: Entry[]): { photos: Photo[]; skipped: { path: string; reason: string }[] } {
  const skipped: { path: string; reason: string }[] = [];
  const photos: Photo[] = [];
  for (const e of sortEntries(entries)) {
    if (IMG_EXT.has(extOf(e.file.name))) photos.push({ id: photos.length, file: e.file, path: e.path, name: e.file.name, removed: false, dateMs: e.file.lastModified });
    else skipped.push({ path: e.path, reason: "not an image" });
  }
  return { photos, skipped };
}

/** Fill in EXIF dates (falls back to modified date, already set). */
export async function loadDates(photos: Photo[]): Promise<void> {
  let i = 0;
  const work = async () => {
    while (i < photos.length) {
      const p = photos[i++];
      if (!/^jpe?g$/.test(extOf(p.name))) continue;
      try { const d = jpegDate(new Uint8Array(await p.file.slice(0, 262144).arrayBuffer())); if (d) p.dateMs = d; } catch { /* keep */ }
    }
  };
  await Promise.all([work(), work(), work(), work()]);
}

export function ordered(photos: Photo[], order: Order): Photo[] {
  const a = [...photos];
  if (order === "name") { const byPath = new Map(sortEntries(a.map((p) => ({ file: p.file, path: p.path }))).map((e, i) => [e.path, i])); a.sort((x, y) => byPath.get(x.path)! - byPath.get(y.path)!); }
  else if (order === "oldest") a.sort((x, y) => x.dateMs - y.dateMs || x.id - y.id);
  else if (order === "newest") a.sort((x, y) => y.dateMs - x.dateMs || x.id - y.id);
  else for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Upright bitmap of the photo (HEIC converted). */
export async function loadBitmap(file: File, maxSide = 0): Promise<ImageBitmap> {
  const ext = extOf(file.name);
  let src: Blob = file;
  if (ext === "heic" || ext === "heif") { const { heicTo } = await import("heic-to"); src = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 }); }
  const bmp = await createImageBitmap(src, { imageOrientation: "from-image" });
  if (!maxSide || Math.max(bmp.width, bmp.height) <= maxSide) return bmp;
  const k = maxSide / Math.max(bmp.width, bmp.height);
  const small = await createImageBitmap(bmp, { resizeWidth: Math.round(bmp.width * k), resizeHeight: Math.round(bmp.height * k), resizeQuality: "high" });
  bmp.close(); return small;
}

// --- thumbnails: generated on demand (when scrolled into view), 4 at a time, HEIC one at a time ---
const cache = new Map<number, Promise<string | null>>();
let running = 0, heicRunning = false;
const queue: (() => void)[] = [];
const pump = () => {
  while (running < 4 && queue.length) { running++; queue.shift()!(); }
};
export function thumbFor(p: Photo, key: object): Promise<string | null> {
  const k = p.id;
  const hit = cache.get(k); if (hit) return hit;
  const pr = new Promise<string | null>((res) => {
    queue.push(async () => {
      try {
        const heic = /^hei[cf]$/.test(extOf(p.name));
        if (heic) while (heicRunning) await new Promise((r) => setTimeout(r, 100));
        if (heic) heicRunning = true;
        try {
          const b = await loadBitmap(p.file);
          const s = Math.min(1, 320 / Math.max(b.width, b.height));
          const c = new OffscreenCanvas(Math.max(1, Math.round(b.width * s)), Math.max(1, Math.round(b.height * s)));
          c.getContext("2d")!.drawImage(b, 0, 0, c.width, c.height); b.close();
          res(URL.createObjectURL(await c.convertToBlob({ type: "image/jpeg", quality: 0.8 })));
        } finally { if (heic) heicRunning = false; }
      } catch { res(null); }
      running--; pump();
    });
  });
  cache.set(k, pr); void key; pump();
  return pr;
}
export function clearThumbs() {
  for (const p of cache.values()) p.then((u) => u && URL.revokeObjectURL(u));
  cache.clear(); queue.length = 0;
}
export { jpegInfo };
