import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { entriesFromDrop, fromPicker, walkDrop, type Dropped } from "./lib/walk";
import { build, type Skipped } from "./lib/pptx";

export default function App() {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("Drop a folder of images here");
  const [skipped, setSkipped] = useState<Skipped[]>([]);
  const pick = useRef<HTMLInputElement>(null);

  async function run(get: () => Promise<Dropped>) {
    if (busy) return;
    setBusy(true); setSkipped([]); setMsg("Reading folder…");
    try {
      const d = await get();
      const t0 = performance.now();
      const skip: Skipped[] = d.unreadable.map((u) => ({ ...u }));
      const r = await build(d.entries, (n, t) => setMsg(`Adding ${n} / ${t}`), skip);
      if (!r.blob) { setMsg("No usable images in that folder."); setSkipped(r.skipped); return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(r.blob); a.download = `${d.name}.pptx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      setMsg(`Done: ${r.used} slides → ${d.name}.pptx (${((performance.now() - t0) / 1000).toFixed(1)} s)`); setSkipped(r.skipped);
    } catch (e) { setMsg("Failed: " + (e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 p-6"
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const roots = entriesFromDrop(e.dataTransfer); run(() => walkDrop(roots)); }}>
      <div className={`flex h-64 w-full max-w-xl items-center justify-center rounded-lg border border-dashed text-lg ${over ? "border-neutral-300 bg-neutral-900" : "border-neutral-700"}`}>
        <span aria-live="polite">{msg}</span>
      </div>
      <input ref={pick} type="file" className="hidden" multiple
        {...({ webkitdirectory: "", directory: "" } as object)}
        onChange={(e) => { const f = e.target.files; if (f?.length) run(async () => fromPicker(f)); e.target.value = ""; }} />
      <Button disabled={busy} onClick={() => pick.current?.click()}>or choose a folder</Button>
      {skipped.length > 0 && (
        <div className="max-h-48 w-full max-w-xl overflow-auto text-sm text-neutral-400">
          <p className="mb-1">Skipped {skipped.length}:</p>
          <ul>{skipped.map((s, i) => <li key={i}>{s.path} — {s.reason}</li>)}</ul>
        </div>
      )}
    </main>
  );
}
