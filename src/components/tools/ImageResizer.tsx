"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { canvasToBlob, drawTo, fileToImage } from "@/lib/image/canvas";

type Mode = "fit" | "exact" | "scale";

export default function ImageResizer() {
  const [mode, setMode] = useState<Mode>("fit");
  const [width, setWidth] = useState(1600);
  const [height, setHeight] = useState(1600);
  const [scale, setScale] = useState(50);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: File[]) => {
    setBusy(true);
    try {
      const out: ResultItem[] = [];
      for (const file of files) {
        const img = await fileToImage(file);
        let w = img.naturalWidth, h = img.naturalHeight;
        if (mode === "fit") {
          const r = Math.min(width / w, height / h, 1);
          w *= r; h *= r;
        } else if (mode === "exact") {
          w = width; h = height;
        } else {
          w *= scale / 100; h *= scale / 100;
        }
        const canvas = drawTo(img, w, h);
        const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
        const blob = await canvasToBlob(canvas, mime, mime === "image/jpeg" ? 0.9 : undefined);
        out.push({
          name: file.name,
          blob,
          before: file.size,
          preview: URL.createObjectURL(blob),
          meta: `${Math.round(w)}×${Math.round(h)}`,
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
        <Dropzone onFiles={onFiles} accept={{ "image/*": [] }} hint="Resizes maintain quality where possible" />
        <ResultList items={items} zipName="resized.zip" onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5 space-y-5">
        <div>
          <div className="label mb-2">Mode</div>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-white/[0.03] p-1">
            {(["fit", "exact", "scale"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md py-2 text-xs uppercase tracking-wider ${
                  mode === m
                    ? "bg-[var(--color-accent)] text-[oklch(15%_0.05_145)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {mode !== "scale" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="label mb-1">Width</div>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="input"
              />
            </label>
            <label className="block">
              <div className="label mb-1">Height</div>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="input"
              />
            </label>
          </div>
        )}

        {mode === "scale" && (
          <div>
            <div className="label mb-2">Scale</div>
            <div className="flex items-baseline justify-between">
              <span className="display text-3xl">{scale}</span>
              <span className="text-xs text-[var(--color-text-dim)]">%</span>
            </div>
            <input
              type="range"
              min={1}
              max={200}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--color-accent)]"
              disabled={busy}
            />
          </div>
        )}

        <p className="text-xs text-[var(--color-text-dim)]">
          <span className="font-mono uppercase">Fit</span> respects aspect ratio inside box.
          <span className="font-mono uppercase"> Exact</span> stretches to fixed size.
          <span className="font-mono uppercase"> Scale</span> multiplies the source.
        </p>
      </aside>
    </div>
  );
}
