"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import { drawTo, fileToImage } from "@/lib/image/canvas";

interface Swatch { hex: string; rgb: [number, number, number]; weight: number; }

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function quantize(data: Uint8ClampedArray, bits = 4): Map<number, number> {
  const buckets = new Map<number, number>();
  const shift = 8 - bits;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i] >> shift;
    const g = data[i + 1] >> shift;
    const b = data[i + 2] >> shift;
    const key = (r << (bits * 2)) | (g << bits) | b;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return buckets;
}

export default function ColorPalette() {
  const [preview, setPreview] = useState<string | null>(null);
  const [palette, setPalette] = useState<Swatch[]>([]);

  const onFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const img = await fileToImage(file);
    setPreview(URL.createObjectURL(file));
    const max = 200;
    const ratio = Math.min(max / img.naturalWidth, max / img.naturalHeight, 1);
    const canvas = drawTo(img, img.naturalWidth * ratio, img.naturalHeight * ratio);
    const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    const bits = 4;
    const buckets = quantize(data, bits);
    const sorted = Array.from(buckets.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const total = sorted.reduce((s, [, c]) => s + c, 0);
    const shift = 8 - bits;
    const swatches = sorted.map<Swatch>(([key, count]) => {
      const r = ((key >> (bits * 2)) & ((1 << bits) - 1)) << shift;
      const g = ((key >> bits) & ((1 << bits) - 1)) << shift;
      const b = (key & ((1 << bits) - 1)) << shift;
      return { hex: rgbToHex(r, g, b), rgb: [r, g, b], weight: count / total };
    });
    setPalette(swatches);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <Dropzone onFiles={onFiles} accept={{ "image/*": [] }} multiple={false} hint="Drop a single image" />
        {preview && (
          <div className="surface mt-4 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="max-h-[480px] w-full object-contain bg-black/40" />
          </div>
        )}
      </div>
      <aside className="surface h-fit p-5">
        <div className="label mb-3">Palette</div>
        {palette.length === 0 && <div className="text-sm text-[var(--color-text-dim)]">Upload an image to extract colors.</div>}
        <div className="space-y-2">
          {palette.map((s) => (
            <button
              key={s.hex}
              onClick={() => navigator.clipboard.writeText(s.hex)}
              className="flex w-full items-center gap-3 rounded-lg border border-[var(--color-border)] bg-white/[0.02] p-3 text-left transition hover:border-[var(--color-border-strong)]"
              title="Click to copy"
            >
              <span className="h-10 w-10 shrink-0 rounded border border-black/30" style={{ background: s.hex }} />
              <span className="flex-1">
                <div className="font-mono text-sm">{s.hex}</div>
                <div className="text-xs text-[var(--color-text-dim)]">
                  rgb({s.rgb.join(", ")}) · {(s.weight * 100).toFixed(1)}%
                </div>
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
