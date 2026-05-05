"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { replaceExt } from "@/lib/format";

export default function BackgroundRemover() {
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);

  const onFiles = async (files: File[]) => {
    setBusy(true);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const out: ResultItem[] = [];
      for (const file of files) {
        setProgress({ name: file.name, pct: 0 });
        const blob = await removeBackground(file, {
          progress: (_key, current, total) => {
            setProgress({ name: file.name, pct: Math.round((current / total) * 100) });
          },
        });
        out.push({
          name: replaceExt(file.name, "png"),
          blob,
          before: file.size,
          preview: URL.createObjectURL(blob),
        });
      }
      setItems((prev) => [...out, ...prev]);
      setProgress(null);
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
          hint="Runs 100% in your browser. First run downloads the model (~40 MB), then it caches."
        />
        {progress && (
          <div className="surface mt-4 p-4">
            <div className="mb-2 text-sm">
              <span className="text-[var(--color-text-muted)]">Processing</span> {progress.name}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full bg-[var(--color-accent)] transition-all"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <div className="mt-1 text-right font-mono text-xs text-[var(--color-text-dim)]">
              {progress.pct}%
            </div>
          </div>
        )}
        <ResultList items={items} zipName="bg-removed.zip" onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5 space-y-3 text-sm text-[var(--color-text-muted)]">
        <div className="display text-2xl text-[var(--color-text)]">On-device AI</div>
        <p>
          Uses ImgLy's WASM model. Output is transparent PNG at the source resolution.
          Best on photos with a clear subject.
        </p>
        <p className="text-xs text-[var(--color-text-dim)]">
          Tip: for product shots, run optimizer afterwards to shrink the PNG.
        </p>
        {busy && <div className="font-mono text-xs text-[var(--color-accent)]">Working…</div>}
      </aside>
    </div>
  );
}
