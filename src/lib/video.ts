import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { loadBitmap } from "./photos";
import { SHAPES, type Settings } from "./settings";
import { drawSlide, captionText } from "./slide";
import type { Tr } from "./transitions";

const FPS = 30;
type C = OffscreenCanvas;
type G = OffscreenCanvasRenderingContext2D;

export async function videoSupport(s: Settings): Promise<string | null> {
  if (typeof VideoEncoder === "undefined" || typeof OffscreenCanvas === "undefined") return "This browser cannot encode video (WebCodecs missing). Use Chrome or Edge.";
  const { vw, vh } = SHAPES[s.shape];
  for (const hw of ["prefer-hardware", "prefer-software"] as const) {
    try { const r = await VideoEncoder.isConfigSupported({ codec: codecFor(vw, vh), width: vw, height: vh, bitrate: 8e6, framerate: FPS, hardwareAcceleration: hw }); if (r.supported) return null; } catch { /* next */ }
  }
  return "This browser has no H.264 encoder.";
}
const codecFor = (w: number, h: number) => (w * h > 1920 * 1088 ? "avc1.640032" : "avc1.640028");

const hash = (a: number, b: number) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** Draw transition frame: old slide a → new slide b at progress p (0..1). */
export function drawTransition(g: G, a: C, b: C, p: number, tr: Tr, W: number, H: number, seed: number) {
  const img = (c: C, x = 0, y = 0) => g.drawImage(c, x, y);
  const clipDraw = (rects: [number, number, number, number][]) => {
    g.save(); g.beginPath(); for (const r of rects) g.rect(r[0], r[1], r[2], r[3]); g.clip(); img(b); g.restore();
  };
  const from = tr.dir; // r,l,d(top),u(bottom)
  const vec: Record<string, [number, number]> = { r: [1, 0], l: [-1, 0], d: [0, -1], u: [0, 1] }; // side the motion starts from (x,y sign)
  const [vx, vy] = vec[from] ?? [1, 0];
  img(a);
  switch (tr.type) {
    case "none": img(b); break;
    case "fade": g.globalAlpha = p; img(b); g.globalAlpha = 1; break;
    case "wipe": {
      if (vx) { const w = W * p; clipDraw([[vx > 0 ? W - w : 0, 0, w, H]]); }
      else { const h = H * p; clipDraw([[0, vy < 0 ? 0 : H - h, W, h]]); }
      break;
    }
    case "push": g.clearRect(0, 0, W, H); img(a, -vx * W * p, vy * H * p); img(b, vx * W * (1 - p), -vy * H * (1 - p)); break;
    case "cover": img(b, vx * W * (1 - p), -vy * H * (1 - p)); break;
    case "pull": img(b); img(a, vx * W * p, -vy * H * p); break;
    case "split": {
      const [o, d] = tr.dir.split("-");
      if (o === "vert") { // vertical split line: strip along the x axis
        if (d === "out") { const w = W * p; clipDraw([[(W - w) / 2, 0, w, H]]); }
        else { const w = (W * p) / 2; clipDraw([[0, 0, w, H], [W - w, 0, w, H]]); }
      } else if (d === "out") { const h = H * p; clipDraw([[0, (H - h) / 2, W, h]]); }
      else { const h = (H * p) / 2; clipDraw([[0, 0, W, h], [0, H - h, W, h]]); }
      break;
    }
    case "dissolve": {
      const cols = 64, rows = Math.max(1, Math.round((cols * H) / W)), cw = W / cols, ch = H / rows, r: [number, number, number, number][] = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (hash(x + seed, y) < p) r.push([x * cw, y * ch, cw + 1, ch + 1]);
      clipDraw(r); break;
    }
    case "randomBar": {
      const n = 40, r: [number, number, number, number][] = [];
      for (let i = 0; i < n; i++) if (hash(i, seed) < p) r.push(tr.dir === "vert" ? [(W / n) * i, 0, W / n + 1, H] : [0, (H / n) * i, W, H / n + 1]);
      clipDraw(r); break;
    }
    case "blinds": {
      const n = 8, r: [number, number, number, number][] = [];
      for (let i = 0; i < n; i++) r.push(tr.dir === "vert" ? [(W / n) * i, 0, (W / n) * p + 0.5, H] : [0, (H / n) * i, W, (H / n) * p + 0.5]);
      clipDraw(r); break;
    }
    case "checker": {
      const n = 8, cs = (tr.dir === "vert" ? H : W) / n, rows = Math.ceil(H / cs), cols = Math.ceil(W / cs), r: [number, number, number, number][] = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const q = (x + y) % 2 === 0 ? Math.min(1, p * 2) : Math.max(0, p * 2 - 1);
        if (q <= 0) continue;
        r.push(tr.dir === "vert" ? [x * cs, y * cs, cs + 1, cs * q + 1] : [x * cs, y * cs, cs * q + 1, cs + 1]);
      }
      clipDraw(r); break;
    }
    case "circle": {
      g.save(); g.beginPath(); g.arc(W / 2, H / 2, p * Math.hypot(W, H) / 2, 0, Math.PI * 2); g.clip(); img(b); g.restore(); break;
    }
    case "zoom": {
      if (tr.dir === "out") { const k = 1 - 0.8 * p; g.globalAlpha = 1; img(b); g.save(); g.globalAlpha = 1 - p; g.translate(W / 2, H / 2); g.scale(k, k); g.drawImage(a, -W / 2, -H / 2); g.restore(); g.globalAlpha = 1; }
      else { const k = 0.2 + 0.8 * p; g.save(); g.globalAlpha = p; g.translate(W / 2, H / 2); g.scale(k, k); g.drawImage(b, -W / 2, -H / 2); g.restore(); g.globalAlpha = 1; }
      break;
    }
    default: img(b);
  }
}

export interface VItem { file: File; name: string; dateMs: number; tr: Tr }

export async function renderVideo(
  items: VItem[], s: Settings, onProgress: (n: number, total: number) => void, signal: AbortSignal,
): Promise<Blob> {
  const { vw: W, vh: H } = SHAPES[s.shape];
  const total = items.length;
  const hold = Math.max(1 / FPS, s.slideSec);
  const trSec = Math.min(s.transitionSec, hold);
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: "avc", width: W, height: H, frameRate: FPS }, fastStart: "in-memory" });
  let encErr: unknown = null;
  const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { encErr = e; } });
  let cfg: VideoEncoderConfig | null = null;
  for (const hw of ["prefer-hardware", "prefer-software"] as const) {
    const c: VideoEncoderConfig = { codec: codecFor(W, H), width: W, height: H, bitrate: 8e6, framerate: FPS, hardwareAcceleration: hw, latencyMode: "quality" };
    try { if ((await VideoEncoder.isConfigSupported(c)).supported) { cfg = c; break; } } catch { /* next */ }
  }
  if (!cfg) throw new Error("No H.264 encoder available");
  enc.configure(cfg);

  const mk = () => new OffscreenCanvas(W, H);
  const work = mk(), wg = work.getContext("2d")!;
  const slideCanvas = async (i: number): Promise<C> => {
    const bmp = await loadBitmap(items[i].file, Math.max(W, H) * 1.5);
    const c = mk(); drawSlide(c.getContext("2d")!, W, H, bmp, s, captionText(s, items[i].name, items[i].dateMs)); bmp.close(); return c;
  };
  const push = async (src: C, tUs: number, key: boolean) => {
    while (enc.encodeQueueSize > 6) { await new Promise((r) => setTimeout(r, 2)); if (encErr) throw encErr; }
    const f = new VideoFrame(src, { timestamp: Math.round(tUs), duration: Math.round(1e6 / FPS) });
    enc.encode(f, { keyFrame: key }); f.close();
  };

  try {
    // decode ahead (2 slides in flight) so decoding overlaps encoding
    const ahead = new Map<number, Promise<C>>();
    const want = (i: number) => { if (i < total && !ahead.has(i)) { const p = slideCanvas(i); p.catch(() => {}); ahead.set(i, p); } };
    want(0); want(1); want(2);
    let prev = await ahead.get(0)!; ahead.delete(0);
    let t = 0; // seconds
    const stepUs = 1e6 / FPS;
    let frame = 0;
    for (let i = 0; i < total; i++) {
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      let cur = prev;
      if (i > 0) {
        want(i); want(i + 1); want(i + 2);
        cur = await ahead.get(i)!; ahead.delete(i);
        const nTr = tr(items[i].tr.type) ? 0 : Math.max(1, Math.round(trSec * FPS));
        for (let k = 0; k < nTr; k++) {
          drawTransition(wg, prev, cur, (k + 1) / (nTr + 1), items[i].tr, W, H, i);
          await push(work, frame * stepUs, k === 0); frame++;
        }
      }
      // hold: one frame at start, one just before the end (variable frame durations keep this fast)
      const holdStart = i === 0 ? 0 : tr(items[i].tr.type) ? 0 : Math.max(1, Math.round(trSec * FPS));
      const holdFrames = Math.max(1, Math.round((hold * FPS) - holdStart));
      await push(cur, frame * stepUs, i === 0 || holdStart === 0);
      if (holdFrames > 1) await push(cur, (frame + holdFrames - 1) * stepUs, false);
      frame += holdFrames; t += hold;
      prev = cur;
      onProgress(i + 1, total);
    }
    await enc.flush();
    if (encErr) throw encErr;
    muxer.finalize();
    return new Blob([target.buffer], { type: "video/mp4" });
  } finally {
    try { enc.close(); } catch { /* already closed */ }
  }
}
const tr = (type: string) => type === "none";
