export interface Dir { v: string; label: string }
export interface TType { id: string; label: string; el: string; dirs: Dir[]; attr?: "dir" | "split" }

const side = (): Dir[] => [{ v: "r", label: "From right" }, { v: "l", label: "From left" }, { v: "d", label: "From top" }, { v: "u", label: "From bottom" }];
const hv: Dir[] = [{ v: "horz", label: "Horizontal" }, { v: "vert", label: "Vertical" }];

export const TYPES: TType[] = [
  { id: "none", label: "None", el: "", dirs: [] },
  { id: "fade", label: "Fade", el: "fade", dirs: [] },
  { id: "wipe", label: "Wipe", el: "wipe", dirs: side(), attr: "dir" },
  { id: "push", label: "Push", el: "push", dirs: side(), attr: "dir" },
  { id: "cover", label: "Cover", el: "cover", dirs: side(), attr: "dir" },
  { id: "pull", label: "Uncover", el: "pull", dirs: side(), attr: "dir" },
  { id: "split", label: "Split", el: "split", attr: "split", dirs: [
    { v: "horz-out", label: "Horizontal out" }, { v: "horz-in", label: "Horizontal in" },
    { v: "vert-out", label: "Vertical out" }, { v: "vert-in", label: "Vertical in" }] },
  { id: "dissolve", label: "Dissolve", el: "dissolve", dirs: [] },
  { id: "randomBar", label: "Random Bars", el: "randomBar", dirs: hv, attr: "dir" },
  { id: "blinds", label: "Blinds", el: "blinds", dirs: hv, attr: "dir" },
  { id: "checker", label: "Checkerboard", el: "checker", dirs: hv, attr: "dir" },
  { id: "circle", label: "Shape (circle)", el: "circle", dirs: [] },
  { id: "zoom", label: "Zoom", el: "zoom", dirs: [{ v: "in", label: "In" }, { v: "out", label: "Out" }], attr: "dir" },
];
export const RANDOM_ID = "random";
export const typeOf = (id: string) => TYPES.find((t) => t.id === id);
export const defaultDir = (id: string) => { const t = typeOf(id); return t?.dirs.find((d) => d.v === "r")?.v ?? t?.dirs[0]?.v ?? ""; };

export interface Tr { type: string; dir: string }

/** Child element of p:transition for a plan entry ("" for none). */
export function transitionEl(tr: Tr): string {
  const t = typeOf(tr.type);
  if (!t || !t.el) return "";
  if (t.attr === "split") { const [o, d] = tr.dir.split("-"); return `<p:split orient="${o}" dir="${d}"/>`; }
  if (t.attr === "dir") return `<p:${t.el} dir="${tr.dir}"/>`;
  return `<p:${t.el}/>`;
}

/** One transition per slide; Random picks per slide (shared by .pptx and video). */
export function planTransitions(n: number, type: string, dir: string): Tr[] {
  if (type !== RANDOM_ID) return Array.from({ length: n }, () => ({ type, dir }));
  const pool = TYPES.filter((t) => t.id !== "none");
  return Array.from({ length: n }, () => {
    const t = pool[Math.floor(Math.random() * pool.length)];
    const d = t.dirs.length ? t.dirs[Math.floor(Math.random() * t.dirs.length)].v : "";
    return { type: t.id, dir: d };
  });
}
