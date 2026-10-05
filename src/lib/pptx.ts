import { Zip, ZipPassThrough } from "fflate";
import { bmpInfo, gifInfo, jpegInfo, pngInfo, type Info } from "./imageinfo";
import { sortEntries, type Entry } from "./walk";

export interface Skipped { path: string; reason: string }
export interface Result { blob: Blob | null; used: number; skipped: Skipped[] }

const W = 12192000, H = 6858000;
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const HDR = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
const enc = new TextEncoder();
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const rels = (items: [string, string, string][]) =>
  HDR + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id, t, tg]) => `<Relationship Id="${id}" Type="${REL}/${t}" Target="${tg}"/>`).join("")}</Relationships>`;

const EMBED: Record<string, (b: Uint8Array) => Info | null> = { jpg: jpegInfo, jpeg: jpegInfo, png: pngInfo, gif: gifInfo, bmp: bmpInfo };
const CONVERT = new Set(["heic", "heif", "webp"]);
const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", gif: "image/gif", bmp: "image/bmp" };

// EXIF orientation -> [rot degrees clockwise, flipH, flipV] applied as OOXML flip-then-rotate
const ORIENT: Record<number, [number, boolean, boolean]> = {
  1: [0, false, false], 2: [0, true, false], 3: [180, false, false], 4: [0, false, true],
  5: [270, true, false], 6: [90, false, false], 7: [90, true, false], 8: [270, false, false],
};

function slideXml(rid: string, name: string, info: Info): string {
  const [rot, fh, fv] = ORIENT[info.orient] ?? ORIENT[1];
  const swap = rot === 90 || rot === 270;
  const dw = swap ? info.h : info.w, dh = swap ? info.w : info.h; // displayed pixel size
  const s = Math.min(W / dw, H / dh);
  const vw = Math.round(dw * s), vh = Math.round(dh * s);
  const cx = swap ? vh : vw, cy = swap ? vw : vh; // unrotated shape extent
  const x = Math.round((W - cx) / 2), y = Math.round((H - cy) / 2);
  const attrs = (rot ? ` rot="${rot * 60000}"` : "") + (fh ? ' flipH="1"' : "") + (fv ? ' flipV="1"' : "");
  const tr = (p14: string) => `<p:transition spd="slow"${p14} advClick="1" advTm="5000"><p:wipe dir="r"/></p:transition>`;
  return HDR + `<p:sld ${NS}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:pic><p:nvPicPr><p:cNvPr id="2" name="Picture 1" descr="${esc(name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm${attrs}><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr><mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" Requires="p14">${tr(' p14:dur="2000"')}</mc:Choice><mc:Fallback>${tr("")}</mc:Fallback></mc:AlternateContent></p:sld>`;
}

const EMPTY_TREE = '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree>';
const MASTER = HDR + `<p:sldMaster ${NS}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>${EMPTY_TREE}</p:cSld><p:clrMap bg1="dk1" tx1="lt1" bg2="dk2" tx2="lt2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`;
const LAYOUT = HDR + `<p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank">${EMPTY_TREE}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
const clr = (n: string, v: string) => `<a:${n}><a:srgbClr val="${v}"/></a:${n}>`;
const ln = '<a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>';
const fill = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
const THEME = HDR + `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Black"><a:themeElements><a:clrScheme name="Black"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>${clr("dk2", "1F1F1F")}${clr("lt2", "E7E6E6")}${["4472C4", "ED7D31", "A5A5A5", "FFC000", "5B9BD5", "70AD47"].map((v, i) => clr("accent" + (i + 1), v)).join("")}${clr("hlink", "0563C1")}${clr("folHlink", "954F72")}</a:clrScheme><a:fontScheme name="Std"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Std"><a:fillStyleLst>${fill}${fill}${fill}</a:fillStyleLst><a:lnStyleLst>${ln}${ln}${ln}</a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst>${fill}${fill}${fill}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

async function toJpeg(file: File): Promise<Uint8Array | null> {
  const ext = file.name.split(".").pop()!.toLowerCase();
  try {
    let blob: Blob;
    if (ext === "webp") {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const g = c.getContext("2d")!;
      g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height); // flatten transparency onto black
      g.drawImage(bmp, 0, 0); bmp.close();
      blob = await c.convertToBlob({ type: "image/jpeg", quality: 0.95 });
    } else {
      const { heicTo } = await import("heic-to");
      blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.95 });
    }
    return new Uint8Array(await blob.arrayBuffer());
  } catch { return null; }
}

export async function build(
  input: Entry[], onProgress: (n: number, total: number) => void, skipped: Skipped[] = [],
): Promise<Result> {
  const cand: Entry[] = [];
  for (const e of sortEntries(input)) {
    const ext = (e.file.name.split(".").pop() ?? "").toLowerCase();
    if (e.file.name.includes(".") && (ext in EMBED || CONVERT.has(ext))) cand.push(e);
    else skipped.push({ path: e.path, reason: "not an image" });
  }
  if (!cand.length) return { blob: null, used: 0, skipped };

  const parts: BlobPart[] = [];
  let pending: Uint8Array[] = [], pendingSize = 0;
  const zip = new Zip((err, chunk) => {
    if (err) throw err;
    pending.push(chunk); pendingSize += chunk.length;
    if (pendingSize > 32e6) { parts.push(new Blob(pending as BlobPart[])); pending = []; pendingSize = 0; } // let the browser spill to disk
  });
  const put = (name: string, data: Uint8Array) => { const f = new ZipPassThrough(name); zip.add(f); f.push(data, true); };
  const putS = (name: string, s: string) => put(name, enc.encode(s));

  const slides: { n: number; ext: string }[] = [];
  const exts = new Set<string>();
  let n = 0, tick = performance.now();
  // read ahead so disk I/O overlaps CRC/zip work
  const ahead = new Map<number, Promise<Uint8Array>>();
  const prefetch = (i: number) => {
    if (i >= cand.length || ahead.has(i) || CONVERT.has((cand[i].file.name.split(".").pop() ?? "").toLowerCase())) return;
    const p = cand[i].file.arrayBuffer().then((b) => new Uint8Array(b)); p.catch(() => {}); ahead.set(i, p);
  };
  for (let i = 0; i < cand.length; i++) {
    for (let k = 0; k < 4; k++) prefetch(i + k);
    const e = cand[i];
    let ext = e.file.name.split(".").pop()!.toLowerCase();
    let bytes: Uint8Array | null = null, info: Info | null = null;
    try {
      if (CONVERT.has(ext)) {
        bytes = await toJpeg(e.file);
        if (!bytes) { skipped.push({ path: e.path, reason: `could not decode ${ext.toUpperCase()}` }); continue; }
        info = jpegInfo(bytes); ext = "jpg";
        if (info) info.orient = 1; // converters already applied orientation
      } else {
        const raw = await (ahead.get(i) ?? e.file.arrayBuffer().then((b) => new Uint8Array(b)));
        ahead.delete(i);
        info = EMBED[ext](raw); bytes = raw;
      }
    } catch { bytes = null; }
    if (!bytes || !info) { skipped.push({ path: e.path, reason: "corrupt or unreadable image" }); continue; }
    if (ext === "jpeg") ext = "jpg";
    n++;
    put(`ppt/media/image${n}.${ext}`, bytes);
    putS(`ppt/slides/slide${n}.xml`, slideXml("rId2", e.file.name, info));
    putS(`ppt/slides/_rels/slide${n}.xml.rels`, rels([["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"], ["rId2", "image", `../media/image${n}.${ext}`]]));
    slides.push({ n, ext }); exts.add(ext);
    onProgress(i + 1, cand.length);
    if (performance.now() - tick > 30) { await new Promise((r) => setTimeout(r)); tick = performance.now(); }
  }
  if (!n) return { blob: null, used: 0, skipped };

  const ct = HDR + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${[...exts].map((x) => `<Default Extension="${x}" ContentType="${MIME[x]}"/>`).join("")}<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides.map((s) => `<Override PartName="/ppt/slides/slide${s.n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}</Types>`;
  putS("[Content_Types].xml", ct);
  putS("_rels/.rels", rels([["rId1", "officeDocument", "ppt/presentation.xml"]]));
  putS("ppt/presentation.xml", HDR + `<p:presentation ${NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((s) => `<p:sldId id="${255 + s.n}" r:id="rId${s.n + 2}"/>`).join("")}</p:sldIdLst><p:sldSz cx="${W}" cy="${H}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`);
  putS("ppt/_rels/presentation.xml.rels", rels([["rId1", "slideMaster", "slideMasters/slideMaster1.xml"], ...slides.map((s): [string, string, string] => [`rId${s.n + 2}`, "slide", `slides/slide${s.n}.xml`]), [`rId${n + 3}`, "theme", "theme/theme1.xml"]]));
  putS("ppt/slideMasters/slideMaster1.xml", MASTER);
  putS("ppt/slideMasters/_rels/slideMaster1.xml.rels", rels([["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"], ["rId2", "theme", "../theme/theme1.xml"]]));
  putS("ppt/slideLayouts/slideLayout1.xml", LAYOUT);
  putS("ppt/slideLayouts/_rels/slideLayout1.xml.rels", rels([["rId1", "slideMaster", "../slideMasters/slideMaster1.xml"]]));
  putS("ppt/theme/theme1.xml", THEME);
  zip.end();
  parts.push(new Blob(pending as BlobPart[]));
  return { blob: new Blob(parts, { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }), used: n, skipped };
}
