import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { SettingsMenu } from "@/components/SettingsMenu";
import { Lightbox } from "@/components/Lightbox";
import { entriesFromDrop, fromPicker, walkDrop, type Dropped } from "./lib/walk";
import { build, type Skipped } from "./lib/pptx";
import { clearThumbs, loadDates, ordered, thumbFor, toPhotos, type Photo } from "./lib/photos";
import { loadSettings, normalize, saveSettings, type Settings } from "./lib/settings";
import { planTransitions } from "./lib/transitions";
import { renderVideo, videoSupport } from "./lib/video";

interface OutFile { name: string; blob: Blob; label: string }
const accentBtn = "inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-300 disabled:hover:bg-accent";

function Thumb({ p, n, over, onOpen, onToggle, onDragStart, onDragOver, onDrop, onDragEnd }: {
  p: Photo; n: number | null; over: boolean; onOpen: () => void; onToggle: () => void;
  onDragStart: (e: React.DragEvent) => void; onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void; onDragEnd: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!; let dead = false;
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); thumbFor(p, el).then((u) => !dead && setSrc(u)); } }, { rootMargin: "400px" });
    io.observe(el); return () => { dead = true; io.disconnect(); };
  }, [p]);
  const removed = p.removed;
  return (
    <div ref={ref} draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
      data-testid="tile" data-removed={removed} data-name={p.name}
      className={`group relative aspect-[4/3] cursor-grab overflow-hidden rounded-md border bg-panel ${over ? "border-accent ring-2 ring-accent" : "border-line"}`}
      onClick={() => (removed ? onToggle() : onOpen())} title={removed ? "Click to restore" : p.path}>
      {src ? <img src={src} alt={p.name} draggable={false} className={`h-full w-full object-contain ${removed ? "opacity-25 grayscale" : ""}`} />
        : <div className="h-full w-full animate-pulse bg-neutral-900" />}
      {n != null && <span className="absolute left-1 top-1 rounded bg-black/75 px-1.5 text-xs font-semibold text-accent">{n}</span>}
      {removed && <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-neutral-300">Removed — click to restore</span>}
      {!removed && <button aria-label={`Remove ${p.name}`} className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded bg-black/75 text-sm text-neutral-200 hover:bg-red-600 group-hover:flex"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}>✕</button>}
      <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1.5 py-0.5 text-[11px] text-neutral-300">{p.name}</span>
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [folder, setFolder] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [baseSkipped, setBaseSkipped] = useState<Skipped[]>([]);
  const [buildSkipped, setBuildSkipped] = useState<Skipped[]>([]);
  const [manual, setManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [over, setOver] = useState(false);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [large, setLarge] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const [vmsg, setVmsg] = useState("");
  const [outputs, setOutputs] = useState<{ key: string; files: OutFile[] } | null>(null);
  const [videoReason, setVideoReason] = useState<string | null | undefined>(undefined);
  const pick = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const dates = useRef<Promise<void>>(Promise.resolve());
  const dragFrom = useRef<number | null>(null);

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => { let d = false; videoSupport(settings).then((r) => !d && setVideoReason(r)); return () => { d = true; }; }, [settings.shape]);
  const set = useCallback((p: Partial<Settings>) => setSettings((s) => normalize({ ...s, ...p })), []);
  const effective: Settings = useMemo(() => ({ ...settings, video: settings.video && !videoReason }), [settings, videoReason]);

  const needsDates = (o: Settings["order"]) => o === "oldest" || o === "newest";
  async function load(get: () => Promise<Dropped>) {
    if (running) return;
    setLoading(true); clearThumbs(); setOutputs(null); setBuildSkipped([]); setMsg(""); setVmsg(""); setLarge(null);
    try {
      const d = await get();
      const { photos: ps, skipped } = toPhotos(d.entries);
      dates.current = loadDates(ps);
      if (needsDates(settings.order)) await dates.current;
      setFolder(d.name); setManual(false);
      setBaseSkipped([...d.unreadable, ...skipped]);
      setPhotos(ordered(ps, settings.order));
    } catch (e) { setMsg("Failed to read folder: " + (e as Error).message); }
    finally { setLoading(false); }
  }

  async function onOrder(o: Settings["order"]) {
    if (manual && photos.length && !window.confirm("Replace your manual order with this ordering?")) return;
    set({ order: o });
    if (!photos.length) return;
    if (needsDates(o)) await dates.current;
    setPhotos((ps) => ordered(ps, o)); setManual(false);
  }

  const included = photos.filter((p) => !p.removed);
  const numbers = useMemo(() => { let n = 0; return photos.map((p) => (p.removed ? null : ++n)); }, [photos]);
  const key = useMemo(() => JSON.stringify([effective, photos.map((p) => [p.id, p.removed])]), [effective, photos]);
  const stale = !!outputs && outputs.key !== key && !running;

  const toggle = (id: number) => setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, removed: !p.removed } : p)));
  const move = (from: number, to: number) => {
    if (from === to) return;
    setPhotos((ps) => { const a = [...ps]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; }); setManual(true);
  };

  async function create() {
    if (running || !included.length) return;
    const s = effective, k = key;
    const ac = new AbortController(); abort.current = ac;
    setRunning(true); setOutputs(null); setBuildSkipped([]); setMsg("Preparing…"); setVmsg("");
    try {
      await dates.current;
      const plan = planTransitions(included.length, s.transition, s.direction);
      const items = included.map((p, i) => ({ file: p.file, path: p.path, name: p.name, dateMs: p.dateMs, tr: plan[i], id: p.id }));
      const t0 = performance.now(), skip: Skipped[] = [];
      const r = await build(items, s, (n, t) => setMsg(`Adding ${n} / ${t}`), skip);
      setBuildSkipped(skip);
      if (!r.blob) { setMsg("No usable images could be built."); return; }
      const files: OutFile[] = [{ name: `${folder}.${s.selfRunning ? "ppsx" : "pptx"}`, blob: r.blob, label: s.selfRunning ? "self-running show" : "PowerPoint" }];
      setOutputs({ key: k, files }); setMsg(`Built ${r.used} slides in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
      if (s.video) {
        const used = new Set(r.usedIds), vt0 = performance.now();
        const vitems = items.filter((i) => used.has(i.id));
        try {
          const blob = await renderVideo(vitems, s, (n, t) => setVmsg(`Rendering video ${n} / ${t}`), ac.signal);
          setOutputs({ key: k, files: [...files, { name: `${folder}.mp4`, blob, label: "video" }] });
          setVmsg(`Video done in ${((performance.now() - vt0) / 1000).toFixed(1)} s`);
        } catch (e) { setVmsg((e as Error).name === "AbortError" ? "Video cancelled — the PowerPoint is still available." : "Video failed: " + (e as Error).message); }
      }
    } catch (e) { setMsg("Failed: " + (e as Error).message); }
    finally { setRunning(false); abort.current = null; }
  }

  function download(f: OutFile) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(f.blob); a.download = f.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }

  const step = useCallback((d: number) => setLarge((cur) => {
    if (cur == null) return cur;
    let i = cur;
    for (let n = 0; n < photos.length; n++) { i = (i + d + photos.length) % photos.length; if (!photos[i].removed) return i; }
    return cur;
  }), [photos]);

  const hasFolder = folder != null;
  const settingsMenu = <SettingsMenu s={settings} set={set} onOrder={onOrder} videoReason={videoReason} centered={!hasFolder} />;
  const input = (
    <input ref={pick} type="file" className="hidden" multiple {...({ webkitdirectory: "", directory: "" } as object)}
      onChange={(e) => { const f = e.target.files; if (f?.length) load(async () => fromPicker(f)); e.target.value = ""; }} />
  );
  const skippedAll = [...baseSkipped, ...buildSkipped];

  return (
    <div className="flex h-full flex-col overflow-hidden"
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setOver(false); }}
      onDrop={(e) => { if (!e.dataTransfer.types.includes("Files")) return; e.preventDefault(); setOver(false); const roots = entriesFromDrop(e.dataTransfer); load(() => walkDrop(roots)); }}>
      {input}
      {!hasFolder ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <Logo size={72} />
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-50">Slideshow Maker</h1>
          <p className="max-w-md text-base text-neutral-400">Drop a folder of photos, check them, and download a PowerPoint slideshow. Nothing is uploaded.</p>
          <div className={`flex h-44 w-full max-w-xl items-center justify-center rounded-xl border-2 border-dashed text-lg transition-colors ${over ? "border-accent bg-accent/10 text-accent" : "border-line text-neutral-400"}`}>
            <span aria-live="polite">{loading ? "Reading folder…" : msg || "Drop a folder of images here"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button disabled={loading} onClick={() => pick.current?.click()}>or choose a folder</Button>
          </div>
          {settingsMenu}
        </main>
      ) : (
        <>
          <header className="flex items-center justify-between border-b border-line px-4 py-2">
            <div className="flex items-center gap-2.5"><Logo size={28} /><span className="text-base font-semibold tracking-tight">Slideshow Maker</span></div>
            {settingsMenu}
          </header>
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-panel px-4 py-2.5">
            <span className="text-sm text-neutral-300"><b className="text-neutral-50">{folder}</b> · {included.length} of {photos.length} photos</span>
            <Button disabled={running || loading} onClick={() => pick.current?.click()}>Choose a different folder</Button>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              {running && <span className="text-sm text-neutral-300" aria-live="polite">{msg}{vmsg && ` · ${vmsg}`}</span>}
              {running && abort.current && vmsg.startsWith("Rendering") && <Button onClick={() => abort.current?.abort()}>Cancel video</Button>}
              {!running && photos.length > 0 && <button className={accentBtn} disabled={!included.length} onClick={create}>Create slideshow</button>}
            </div>
          </div>
          {(outputs || msg || vmsg) && !running && (
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2 text-sm">
              <span className="text-neutral-400">{msg}{vmsg && ` · ${vmsg}`}</span>
              {stale && <span className="rounded bg-amber-500/15 px-2 py-0.5 text-amber-300">Out of date — click Create slideshow again to rebuild.</span>}
              {outputs && !stale && outputs.files.map((f) => <button key={f.name} className={accentBtn} onClick={() => download(f)}>Download {f.name}</button>)}
            </div>
          )}
          {running && outputs && (
            <div className="flex gap-3 border-b border-line px-4 py-2 text-sm">{outputs.files.map((f) => <button key={f.name} className={accentBtn} onClick={() => download(f)}>Download {f.name}</button>)}</div>
          )}
          <main className="flex-1 overflow-y-auto p-4">
            {photos.length === 0 ? (
              <p className="py-10 text-center text-neutral-400">No usable images in that folder.</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2" data-testid="grid">
                {photos.map((p, i) => (
                  <Thumb key={p.id} p={p} n={numbers[i]} over={dragOver === i} onOpen={() => setLarge(i)} onToggle={() => toggle(p.id)}
                    onDragStart={(e) => { dragFrom.current = i; e.dataTransfer.setData("application/x-slide", String(i)); e.dataTransfer.effectAllowed = "move"; }}
                    onDragOver={(e) => { if (dragFrom.current != null) { e.preventDefault(); setDragOver(i); } }}
                    onDrop={(e) => { if (dragFrom.current == null) return; e.preventDefault(); e.stopPropagation(); move(dragFrom.current, i); dragFrom.current = null; setDragOver(null); }}
                    onDragEnd={() => { dragFrom.current = null; setDragOver(null); }} />
                ))}
              </div>
            )}
            {skippedAll.length > 0 && (
              <section className="mt-6 max-h-56 overflow-auto text-sm text-neutral-400" aria-label="Skipped files">
                <p className="mb-1 font-medium text-neutral-300">Skipped {skippedAll.length}:</p>
                <ul>{skippedAll.map((s, i) => <li key={i}>{s.path} — {s.reason}</li>)}</ul>
              </section>
            )}
          </main>
        </>
      )}
      {over && hasFolder && <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center border-4 border-dashed border-accent bg-black/70 text-xl text-accent">Drop to load this folder instead</div>}
      {large != null && photos[large] && !photos[large].removed && (
        <Lightbox photo={photos[large]} index={numbers[large]! - 1} count={included.length} s={effective} onClose={() => setLarge(null)} onStep={step} />
      )}
    </div>
  );
}
