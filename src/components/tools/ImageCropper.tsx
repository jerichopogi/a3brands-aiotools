"use client";

import { useEffect, useRef, useState } from "react";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { canvasToBlob, fileToImage } from "@/lib/image/canvas";
import { replaceExt } from "@/lib/format";

type Preset = { label: string; ratio: number | null };
const PRESETS: Preset[] = [
  { label: "Free", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "4:5", ratio: 4 / 5 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "3:2", ratio: 3 / 2 },
  { label: "OG 1.91:1", ratio: 1.91 },
];

export default function ImageCropper() {
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [preset, setPreset] = useState<Preset>(PRESETS[0]);
  const [crop, setCrop] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [items, setItems] = useState<ResultItem[]>([]);
  const dragRef = useRef<{ startX: number; startY: number; orig: typeof crop } | null>(null);

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setImg(await fileToImage(f));
  };

  useEffect(() => {
    if (preset.ratio == null || !img) return;
    setCrop((c) => {
      const w = c.w;
      const h = (w * img.naturalWidth) / (preset.ratio! * img.naturalHeight);
      const cy = Math.min(Math.max(c.y, 0), 1 - h);
      return { x: c.x, y: cy, w, h };
    });
  }, [preset, img]);

  const startDrag = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, orig: crop };
  };
  const moveDrag = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dx = (e.clientX - dragRef.current.startX) / r.width;
    const dy = (e.clientY - dragRef.current.startY) / r.height;
    const o = dragRef.current.orig;
    setCrop({
      x: Math.min(Math.max(o.x + dx, 0), 1 - o.w),
      y: Math.min(Math.max(o.y + dy, 0), 1 - o.h),
      w: o.w,
      h: o.h,
    });
  };
  const endDrag = () => { dragRef.current = null; };

  const apply = async () => {
    if (!file || !img) return;
    const sx = crop.x * img.naturalWidth;
    const sy = crop.y * img.naturalHeight;
    const sw = crop.w * img.naturalWidth;
    const sh = crop.h * img.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, file.type === "image/png" ? "image/png" : "image/jpeg", 0.92);
    const ext = file.type === "image/png" ? "png" : "jpg";
    setItems((prev) => [
      {
        name: replaceExt(file.name, `cropped.${ext}`),
        blob,
        before: file.size,
        preview: URL.createObjectURL(blob),
        meta: `${canvas.width}×${canvas.height}`,
      },
      ...prev,
    ]);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        {!img && <Dropzone onFiles={onFiles} accept={{ "image/*": [] }} multiple={false} hint="Single image — drag to position the crop" />}
        {img && (
          <div className="surface overflow-hidden">
            <div
              className="relative select-none"
              style={{ aspectRatio: `${img.naturalWidth} / ${img.naturalHeight}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt="" className="absolute inset-0 h-full w-full object-contain opacity-50" />
              <div
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                className="absolute cursor-move border-2 border-[var(--color-accent)] shadow-[0_0_0_99999px_oklch(0%_0_0_/_0.55)]"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.w * 100}%`,
                  height: `${crop.h * 100}%`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt=""
                  className="pointer-events-none absolute h-auto w-auto max-w-none"
                  style={{
                    left: `-${(crop.x / crop.w) * 100}%`,
                    top: `-${(crop.y / crop.h) * 100}%`,
                    width: `${(1 / crop.w) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] p-4">
              <button className="btn btn-ghost" onClick={() => { setFile(null); setImg(null); }}>
                New image
              </button>
              <button className="btn btn-primary" onClick={apply}>Apply crop</button>
            </div>
          </div>
        )}
        <ResultList items={items} zipName="crops.zip" onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5 space-y-4">
        <div className="label">Aspect</div>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPreset(p)}
              className={`rounded-md border px-3 py-2 text-sm ${
                preset.label === p.label
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div>
          <div className="label mb-2">Crop size</div>
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(crop.w * 100)}
            onChange={(e) => {
              const w = Number(e.target.value) / 100;
              const h = preset.ratio
                ? (w * (img?.naturalWidth || 1)) / (preset.ratio * (img?.naturalHeight || 1))
                : crop.h;
              setCrop((c) => ({
                x: Math.min(c.x, 1 - w),
                y: Math.min(c.y, 1 - h),
                w,
                h,
              }));
            }}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>
      </aside>
    </div>
  );
}
