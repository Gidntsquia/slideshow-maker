import { useEffect, useRef } from "react";
import { loadBitmap, type Photo } from "@/lib/photos";
import { SHAPES, type Settings } from "@/lib/settings";
import { captionText, drawSlide } from "@/lib/slide";

export function Lightbox({ photo, index, count, s, onClose, onStep }: { photo: Photo; index: number; count: number; s: Settings; onClose: () => void; onStep: (d: number) => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const { vw, vh } = SHAPES[s.shape];
  const k = 1400 / Math.max(vw, vh), W = Math.round(vw * k), H = Math.round(vh * k);
  useEffect(() => {
    let dead = false;
    loadBitmap(photo.file, 3000).then((b) => {
      if (dead || !cv.current) return b.close();
      drawSlide(cv.current.getContext("2d")!, W, H, b, s, captionText(s, photo.name, photo.dateMs)); b.close();
    }).catch(() => {});
    return () => { dead = true; };
  }, [photo, s, W, H]);
  useEffect(() => {
    const kd = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowLeft") onStep(-1); else if (e.key === "ArrowRight") onStep(1); };
    window.addEventListener("keydown", kd); return () => window.removeEventListener("keydown", kd);
  }, [onClose, onStep]);
  return (
    <div role="dialog" aria-label="Large view" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 p-4" onClick={onClose}>
      <canvas ref={cv} width={W} height={H} data-testid="large" className="rounded-sm shadow-2xl shadow-black ring-1 ring-line" style={{ maxWidth: "92vw", maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()} />
      <div className="text-sm text-neutral-400" onClick={(e) => e.stopPropagation()}>
        <button aria-label="Previous" className="px-3 text-lg hover:text-white" onClick={() => onStep(-1)}>←</button>
        Slide {index + 1} of {count} · {photo.path}
        <button aria-label="Next" className="px-3 text-lg hover:text-white" onClick={() => onStep(1)}>→</button>
        <button className="ml-4 rounded border border-line px-2 py-0.5 hover:bg-neutral-900" onClick={onClose}>Close (Esc)</button>
      </div>
    </div>
  );
}
