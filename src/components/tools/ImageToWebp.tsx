"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { canvasToBlob, drawTo, fileToImage } from "@/lib/image/canvas";
import { replaceExt } from "@/lib/format";

export default function ImageToWebp() {
  const [quality, setQuality] = useState(0.82);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: File[]) => {
    setBusy(true);
    try {
      const out: ResultItem[] = [];
      for (const file of files) {
        const img = await fileToImage(file);
        const canvas = drawTo(img, img.naturalWidth, img.naturalHeight);
        const blob = await canvasToBlob(canvas, "image/webp", quality);
        out.push({
          name: replaceExt(file.name, "webp"),
          blob,
          before: file.size,
          preview: URL.createObjectURL(blob),
          meta: `${img.naturalWidth}×${img.naturalHeight}`,
        });
      }
      setItems((prev) => [...out, ...prev]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Dropzone
          onFiles={onFiles}
          accept={{ "image/*": [] }}
          hint="JPG, PNG, AVIF, GIF, BMP — converted to WebP entirely in your browser"
        />
        <ResultList
          items={items}
          zipName="webp-output.zip"
          onClear={() => setItems([])}
        />
      </div>
      <aside className="surface h-fit p-5">
        <div className="label mb-2">Quality</div>
        <div className="flex items-baseline justify-between">
          <span className="display text-3xl">{Math.round(quality * 100)}</span>
          <span className="text-xs text-[var(--color-text-dim)]">0–100</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={Math.round(quality * 100)}
          onChange={(e) => setQuality(Number(e.target.value) / 100)}
          className="mt-3 w-full accent-[var(--color-accent)]"
          disabled={busy}
        />
        <p className="mt-4 text-xs leading-relaxed text-[var(--color-text-dim)]">
          82 is a strong default — almost lossless to the eye, and typically 25–60%
          smaller than the source JPG/PNG.
        </p>
      </aside>
    </div>
  );
}
