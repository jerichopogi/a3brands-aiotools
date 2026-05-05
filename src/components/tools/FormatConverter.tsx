"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { canvasToBlob, drawTo, fileToImage } from "@/lib/image/canvas";
import { replaceExt } from "@/lib/format";

type Target = "webp" | "jpeg" | "png" | "avif";

const MIME: Record<Target, string> = {
  webp: "image/webp",
  jpeg: "image/jpeg",
  png: "image/png",
  avif: "image/avif",
};

export default function FormatConverter() {
  const [target, setTarget] = useState<Target>("webp");
  const [quality, setQuality] = useState(0.9);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: File[]) => {
    setBusy(true);
    try {
      const out: ResultItem[] = [];
      for (const file of files) {
        const img = await fileToImage(file);
        const canvas = drawTo(img, img.naturalWidth, img.naturalHeight);
        const useQuality = target !== "png";
        const blob = await canvasToBlob(canvas, MIME[target], useQuality ? quality : undefined);
        out.push({
          name: replaceExt(file.name, target === "jpeg" ? "jpg" : target),
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
        <Dropzone onFiles={onFiles} accept={{ "image/*": [] }} hint="Browser-native re-encode. AVIF is supported in modern Chromium." />
        <ResultList items={items} zipName={`converted-${target}.zip`} onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5 space-y-5">
        <div>
          <div className="label mb-2">Target format</div>
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-white/[0.03] p-1">
            {(Object.keys(MIME) as Target[]).map((t) => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                className={`rounded-md py-2 text-xs uppercase tracking-wider ${
                  target === t
                    ? "bg-[var(--color-accent)] text-[oklch(15%_0.05_145)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {target !== "png" && (
          <div>
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
          </div>
        )}
      </aside>
    </div>
  );
}
