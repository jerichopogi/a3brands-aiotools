"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { canvasToBlob } from "@/lib/image/canvas";
import { loadPdfJs } from "@/lib/pdf/pdfjs";

type Format = "png" | "jpeg";

export default function PdfToImage() {
  const [scale, setScale] = useState(2);
  const [format, setFormat] = useState<Format>("png");
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: File[]) => {
    setBusy(true);
    try {
      const pdfjs = await loadPdfJs();
      const out: ResultItem[] = [];
      for (const file of files) {
        const data = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data }).promise;
        const baseName = file.name.replace(/\.pdf$/i, "");
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          const mime = format === "png" ? "image/png" : "image/jpeg";
          const blob = await canvasToBlob(canvas, mime, format === "jpeg" ? 0.92 : undefined);
          out.push({
            name: `${baseName}-p${String(i).padStart(2, "0")}.${format === "jpeg" ? "jpg" : "png"}`,
            blob,
            preview: URL.createObjectURL(blob),
            meta: `${canvas.width}×${canvas.height}`,
          });
        }
      }
      setItems((prev) => [...out, ...prev]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Dropzone onFiles={onFiles} accept={{ "application/pdf": [".pdf"] }} hint="Renders every page in your browser" />
        {busy && <div className="surface mt-4 p-4 text-sm">Rendering pages…</div>}
        <ResultList items={items} zipName="pdf-pages.zip" onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5 space-y-5">
        <div>
          <div className="label mb-2">Format</div>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-white/[0.03] p-1">
            {(["png", "jpeg"] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`rounded-md py-2 text-xs uppercase tracking-wider ${
                  format === f
                    ? "bg-[var(--color-accent)] text-[oklch(15%_0.05_145)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="label mb-2">Scale (DPI ≈ 72×scale)</div>
          <div className="flex items-baseline justify-between">
            <span className="display text-3xl">{scale}×</span>
            <span className="text-xs text-[var(--color-text-dim)]">≈ {72 * scale} dpi</span>
          </div>
          <input
            type="range"
            min={1}
            max={4}
            step={0.5}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--color-accent)]"
          />
        </div>
      </aside>
    </div>
  );
}

