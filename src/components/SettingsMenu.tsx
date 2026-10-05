import { useEffect, useRef, useState } from "react";
import { DEFAULTS, normalize, type Settings } from "@/lib/settings";
import { TYPES, RANDOM_ID, defaultDir, typeOf } from "@/lib/transitions";

const label = "mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500";
const field = "w-full rounded-md border border-line bg-ink px-2 py-1.5 text-sm text-neutral-200 focus:outline focus:outline-1 focus:outline-accent";

function Num({ value, min, max, step, onCommit, id }: { value: number; min: number; max: number; step: number; onCommit: (n: number) => void; id: string }) {
  const [raw, setRaw] = useState(String(value));
  useEffect(() => setRaw(String(value)), [value]);
  const commit = () => { const n = parseFloat(raw); if (Number.isFinite(n)) onCommit(Math.min(max, Math.max(min, n))); else setRaw(String(value)); };
  return <input id={id} type="number" className={field} min={min} max={max} step={step} value={raw}
    onChange={(e) => { setRaw(e.target.value); const n = parseFloat(e.target.value); if (Number.isFinite(n) && n >= min && n <= max) onCommit(n); }}
    onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} />;
}

function Seg<T extends string>({ value, opts, onPick, name }: { value: T; opts: [T, string][]; onPick: (v: T) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-1">
      {opts.map(([v, l]) => (
        <button key={v} role="radio" aria-checked={value === v} onClick={() => onPick(v)}
          className={`rounded-md border px-2.5 py-1 text-sm ${value === v ? "border-accent bg-accent/15 text-accent" : "border-line text-neutral-300 hover:bg-neutral-900"}`}>{l}</button>
      ))}
    </div>
  );
}

export function SettingsMenu({ s, set, onOrder, videoReason, centered }: {
  s: Settings; set: (p: Partial<Settings>) => void; onOrder: (o: Settings["order"]) => void; videoReason: string | null | undefined; centered: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [open]);
  const t = typeOf(s.transition);
  return (
    <div ref={ref}>
      <button aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-1.5 text-sm text-neutral-200 hover:border-neutral-500">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
        Settings <span className="text-neutral-500">▾</span>
      </button>
      {open && <>
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
        <div role="dialog" aria-label="Settings"
          className={`fixed z-40 max-h-[calc(100vh-5rem)] w-[25rem] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-line bg-panel p-4 shadow-2xl shadow-black ${centered ? "left-1/2 top-16 -translate-x-1/2" : "right-3 top-12"}`}>
          <div className="space-y-4">
            <Group title="Transition">
              <div className="grid grid-cols-2 gap-2">
                <div><label className={label} htmlFor="s-trans">Type</label>
                  <select id="s-trans" className={field} value={s.transition} onChange={(e) => set({ transition: e.target.value, direction: defaultDir(e.target.value) })}>
                    {TYPES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}<option value={RANDOM_ID}>Random</option>
                  </select></div>
                {t && t.dirs.length > 0 && <div><label className={label} htmlFor="s-dir">Direction</label>
                  <select id="s-dir" className={field} value={s.direction} onChange={(e) => set({ direction: e.target.value })}>
                    {t.dirs.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
                  </select></div>}
              </div>
              <div><label className={label} htmlFor="s-ttime">Transition time (s)</label>
                <Num id="s-ttime" value={s.transitionSec} min={0.25} max={10} step={0.25} onCommit={(n) => set({ transitionSec: n })} /></div>
            </Group>
            <Group title="Timing">
              <div><label className={label} htmlFor="s-sec">Seconds per slide</label>
                <Num id="s-sec" value={s.slideSec} min={1} max={60} step={1} onCommit={(n) => set({ slideSec: n })} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.auto} disabled={s.selfRunning} onChange={(e) => set({ auto: e.target.checked })} />
                Advance automatically <span className="text-neutral-500">(click always advances)</span></label>
            </Group>
            <Group title="Picture">
              <div><span className={label}>Image fit</span><Seg name="Image fit" value={s.fit} opts={[["fit", "Fit whole"], ["fill", "Fill and crop"]]} onPick={(fit) => set({ fit })} /></div>
              <div><span className={label}>Background</span>
                <div className="flex items-center gap-2"><Seg name="Background" value={s.bg} opts={[["black", "Black"], ["white", "White"], ["custom", "Custom"]]} onPick={(bg) => set({ bg })} />
                  <input aria-label="Custom background colour" type="color" value={s.customBg} onChange={(e) => set({ bg: "custom", customBg: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent" /></div></div>
              <div><span className={label}>Slide shape</span><Seg name="Slide shape" value={s.shape} opts={[["16:9", "16:9"], ["4:3", "4:3"], ["9:16", "9:16 vertical"]]} onPick={(shape) => set({ shape })} /></div>
              <div><span className={label}>Caption</span><Seg name="Caption" value={s.caption} opts={[["off", "Off"], ["name", "File name"], ["date", "Date taken"]]} onPick={(caption) => set({ caption })} /></div>
            </Group>
            <Group title="Photo order">
              <Seg name="Photo order" value={s.order} opts={[["name", "Name"], ["oldest", "Oldest first"], ["newest", "Newest first"], ["shuffle", "Shuffle"]]} onPick={onOrder} />
            </Group>
            <Group title="Output">
              <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={s.selfRunning} onChange={(e) => set({ selfRunning: e.target.checked })} />
                <span>Self-running show (.ppsx)<span className="block text-xs text-neutral-500">Opens full screen, plays on its own and loops until Esc. Forces automatic advance.</span></span></label>
              <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={s.video && !videoReason} disabled={!!videoReason} onChange={(e) => set({ video: e.target.checked })} />
                <span>Also make a video (MP4)<span className="block text-xs text-neutral-500">{videoReason ?? "1080p, 30 fps, same photos and transitions, no audio."}</span></span></label>
            </Group>
            <button className="w-full rounded-md border border-line py-1.5 text-sm text-neutral-300 hover:bg-neutral-900" onClick={() => set(normalize({ ...DEFAULTS }))}>Reset to defaults</button>
          </div>
        </div>
      </>}
    </div>
  );
}
const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="space-y-2 border-t border-line pt-3 first:border-0 first:pt-0"><legend className="mb-1 text-sm font-semibold text-neutral-100">{title}</legend>{children}</fieldset>
);
