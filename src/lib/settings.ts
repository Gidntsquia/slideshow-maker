export type Fit = "fit" | "fill";
export type Order = "name" | "oldest" | "newest" | "shuffle";
export type Shape = "16:9" | "4:3" | "9:16";
export type Caption = "off" | "name" | "date";

export interface Settings {
  transition: string; direction: string; transitionSec: number;
  slideSec: number; auto: boolean;
  fit: Fit; bg: "black" | "white" | "custom"; customBg: string;
  order: Order; shape: Shape; caption: Caption;
  selfRunning: boolean; video: boolean;
}

export const DEFAULTS: Settings = {
  transition: "wipe", direction: "r", transitionSec: 2, slideSec: 5, auto: true,
  fit: "fit", bg: "black", customBg: "#222222", order: "name", shape: "16:9", caption: "off",
  selfRunning: false, video: false,
};

const KEY = "slideshow-maker.settings.v1";
export function loadSettings(): Settings {
  try {
    const s = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") } as Settings;
    return normalize(s);
  } catch { return { ...DEFAULTS }; }
}
export function saveSettings(s: Settings) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }

export function normalize(s: Settings): Settings {
  const n = { ...s };
  n.transitionSec = Math.min(10, Math.max(0.25, Math.round(n.transitionSec * 4) / 4)) || 2;
  n.slideSec = Math.min(60, Math.max(1, Math.round(n.slideSec))) || 5;
  if (!/^#[0-9a-fA-F]{6}$/.test(n.customBg)) n.customBg = DEFAULTS.customBg;
  if (n.selfRunning) n.auto = true;
  return n;
}

export const bgHex = (s: Settings) => (s.bg === "black" ? "000000" : s.bg === "white" ? "FFFFFF" : s.customBg.slice(1).toUpperCase());
export function isLight(hex: string) {
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

/** Slide size in EMU and in video pixels (≈ same pixel count as 1080p). */
export const SHAPES: Record<Shape, { w: number; h: number; vw: number; vh: number }> = {
  "16:9": { w: 12192000, h: 6858000, vw: 1920, vh: 1080 },
  "4:3": { w: 9144000, h: 6858000, vw: 1600, vh: 1200 },
  "9:16": { w: 6858000, h: 12192000, vw: 1080, vh: 1920 },
};
