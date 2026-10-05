import { bgHex, isLight, SHAPES, type Settings } from "./settings";

export const CAP_H = 0.075, CAP_FONT = 0.037; // fractions of slide height

export function fmtDate(ms: number | undefined) {
  return ms ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
}
export function captionText(s: Settings, name: string, dateMs?: number) {
  return s.caption === "name" ? name : s.caption === "date" ? fmtDate(dateMs) : "";
}
export const capColors = (s: Settings) => {
  const bg = bgHex(s); return { bg, fg: isLight(bg) ? "000000" : "FFFFFF" };
};

type Ctx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

/** Draw one slide (upright bitmap) into a W×H context exactly like the .pptx lays it out. */
export function drawSlide(g: Ctx, W: number, H: number, img: CanvasImageSource & { width: number; height: number }, s: Settings, caption: string) {
  g.fillStyle = "#" + bgHex(s); g.fillRect(0, 0, W, H);
  const sc = (s.fit === "fill" ? Math.max : Math.min)(W / img.width, H / img.height);
  const dw = img.width * sc, dh = img.height * sc;
  g.imageSmoothingQuality = "high";
  g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  if (caption) {
    const { bg, fg } = capColors(s);
    const m = Math.min(W, H), ch = m * CAP_H;
    g.fillStyle = `rgba(${parseInt(bg.slice(0, 2), 16)},${parseInt(bg.slice(2, 4), 16)},${parseInt(bg.slice(4, 6), 16)},0.7)`;
    g.fillRect(0, H - ch, W, ch);
    g.fillStyle = "#" + fg; g.font = `${m * CAP_FONT}px Calibri, "Segoe UI", sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(caption, W / 2, H - ch / 2, W * 0.95);
  }
}
export const shapeOf = (s: Settings) => SHAPES[s.shape];
