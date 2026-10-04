export interface Entry { file: File; path: string }
export interface Dropped { name: string; entries: Entry[]; unreadable: { path: string; reason: string }[] }

const readAll = (r: FileSystemDirectoryReader) =>
  new Promise<FileSystemEntry[]>(async (res, rej) => {
    const out: FileSystemEntry[] = [];
    const next = () => r.readEntries((b) => (b.length ? (out.push(...b), next()) : res(out)), rej);
    next();
  });

async function walk(e: FileSystemEntry, base: string, d: Dropped) {
  const path = base + e.name;
  try {
    if (e.isFile) {
      const file = await new Promise<File>((a, b) => (e as FileSystemFileEntry).file(a, b));
      d.entries.push({ file, path });
    } else if (e.isDirectory) {
      for (const c of await readAll((e as FileSystemDirectoryEntry).createReader())) await walk(c, path + "/", d);
    }
  } catch { d.unreadable.push({ path, reason: "could not be read" }); }
}

/** Must be called synchronously inside the drop handler (items die after the first await). */
export function entriesFromDrop(dt: DataTransfer): FileSystemEntry[] {
  return [...dt.items].map((i) => i.webkitGetAsEntry()).filter((x): x is FileSystemEntry => !!x);
}

export async function walkDrop(roots: FileSystemEntry[]): Promise<Dropped> {
  const dirs = roots.filter((r) => r.isDirectory);
  const d: Dropped = { name: dirs.length === 1 && roots.length === 1 ? dirs[0].name : "slideshow", entries: [], unreadable: [] };
  for (const r of roots) await walk(r, "", d);
  // when a single folder was dropped, paths are relative to it
  if (roots.length === 1 && dirs.length === 1) for (const e of d.entries) e.path = e.path.slice(d.name.length + 1);
  return d;
}

export function fromPicker(files: FileList): Dropped {
  const list = [...files];
  const name = list[0]?.webkitRelativePath.split("/")[0] || "slideshow";
  return { name, unreadable: [], entries: list.map((f) => ({ file: f, path: f.webkitRelativePath.split("/").slice(1).join("/") })) };
}

const col = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
/** Top-level files first, then everything else by natural path order (Explorer-like). */
export function sortEntries(a: Entry[]): Entry[] {
  const top = (e: Entry) => !e.path.includes("/");
  const seg = (p: string) => p.split("/");
  return [...a].sort((x, y) => {
    if (top(x) !== top(y)) return top(x) ? -1 : 1;
    const sx = seg(x.path), sy = seg(y.path);
    for (let i = 0; i < Math.min(sx.length, sy.length); i++) {
      const lastX = i === sx.length - 1, lastY = i === sy.length - 1;
      if (lastX !== lastY) return lastX ? -1 : 1; // files before subfolders at same level
      const c = col.compare(sx[i], sy[i]);
      if (c) return c;
    }
    return 0;
  });
}
