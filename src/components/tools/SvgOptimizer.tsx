"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";

export default function SvgOptimizer() {
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: File[]) => {
    setBusy(true);
    try {
      const { optimize } = await import("svgo/dist/svgo.browser.js");
      const out: ResultItem[] = [];
      for (const file of files) {
        const text = await file.text();
        const result = optimize(text, {
          multipass: true,
          plugins: [
            {
              name: "preset-default",
              params: { overrides: { removeViewBox: false } },
            },
            "removeDimensions",
          ],
        });
        const blob = new Blob([result.data], { type: "image/svg+xml" });
        out.push({
          name: file.name,
          blob,
          before: file.size,
          preview: URL.createObjectURL(blob),
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
          accept={{ "image/svg+xml": [".svg"] }}
          hint="SVGO preset-default + removeDimensions, viewBox preserved"
        />
        {busy && <div className="surface mt-4 p-4 text-sm">Optimizing…</div>}
        <ResultList items={items} zipName="svgs.zip" onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5 text-sm text-[var(--color-text-muted)]">
        <div className="display mb-2 text-2xl text-[var(--color-text)]">SVGO</div>
        <p className="text-xs text-[var(--color-text-dim)]">
          Strips editor metadata, comments, dead attributes, and collapses redundant groups.
          Aggressive enough to halve most exports.
        </p>
      </aside>
    </div>
  );
}
