export interface Info { w: number; h: number; orient: number }

export function jpegInfo(b: Uint8Array): Info | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let o = 2, orient = 1, w = 0, h = 0;
  while (o + 4 <= b.length) {
    if (b[o] !== 0xff) { o++; continue; }
    const m = b[o + 1];
    if (m === 0xff) { o++; continue; }
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { o += 2; continue; }
    const len = (b[o + 2] << 8) | b[o + 3];
    if (m === 0xe1 && b[o + 4] === 0x45 && b[o + 5] === 0x78 && b[o + 6] === 0x69 && b[o + 7] === 0x66) orient = exifOrient(b, o + 10, o + 2 + len) || orient;
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      h = (b[o + 5] << 8) | b[o + 6]; w = (b[o + 7] << 8) | b[o + 8];
      break;
    }
    if (m === 0xda) break;
    o += 2 + len;
  }
  return w && h ? { w, h, orient } : null;
}

function exifOrient(b: Uint8Array, t: number, end: number): number {
  const le = b[t] === 0x49;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const u16 = (p: number) => dv.getUint16(p, le), u32 = (p: number) => dv.getUint32(p, le);
  if (t + 8 > end) return 1;
  let p = t + u32(t + 4);
  if (p + 2 > end) return 1;
  const n = u16(p); p += 2;
  for (let i = 0; i < n && p + 12 <= end; i++, p += 12) if (u16(p) === 0x0112) { const v = u16(p + 8); return v >= 1 && v <= 8 ? v : 1; }
  return 1;
}

export function pngInfo(b: Uint8Array): Info | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 24 || sig.some((v, i) => b[i] !== v)) return null;
  const dv = new DataView(b.buffer, b.byteOffset);
  const w = dv.getUint32(16), h = dv.getUint32(20);
  return w && h ? { w, h, orient: 1 } : null;
}
export function gifInfo(b: Uint8Array): Info | null {
  if (b.length < 10 || b[0] !== 0x47 || b[1] !== 0x49 || b[2] !== 0x46) return null;
  const w = b[6] | (b[7] << 8), h = b[8] | (b[9] << 8);
  return w && h ? { w, h, orient: 1 } : null;
}
export function bmpInfo(b: Uint8Array): Info | null {
  if (b.length < 26 || b[0] !== 0x42 || b[1] !== 0x4d) return null;
  const dv = new DataView(b.buffer, b.byteOffset);
  const w = Math.abs(dv.getInt32(18, true)), h = Math.abs(dv.getInt32(22, true));
  return w && h ? { w, h, orient: 1 } : null;
}
