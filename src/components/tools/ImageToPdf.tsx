"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";

type PageSize = "auto" | "a4" | "letter";
const SIZES: Record<Exclude<PageSize, "auto">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

export default function ImageToPdf() {
  const [files, setFiles] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("auto");
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState(false);

  const onFiles = (incoming: File[]) =>
    setFiles((prev) => [...prev, ...incoming.filter((f) => /^image\/(png|jpeg|jpg|webp)$/.test(f.type))]);

  const move = (i: number, dir: -1 | 1) =>
    setFiles((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const copy = [...arr];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const remove = (i: number) => setFiles((arr) => arr.filter((_, k) => k !== i));

  const build = async () => {
    if (files.length === 0) return;
    setBusy(true);
    try {
      const doc = await PDFDocument.create();
      for (const f of files) {
        const bytes = await f.arrayBuffer();
        const isPng = f.type === "image/png";
        const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        let pageW: number, pageH: number;
        if (pageSize === "auto") {
          pageW = img.width;
          pageH = img.height;
        } else {
          [pageW, pageH] = SIZES[pageSize];
        }
        const page = doc.addPage([pageW, pageH]);
        const r = Math.min(pageW / img.width, pageH / img.height);
        const w = img.width * r;
        const h = img.height * r;
        page.drawImage(img, { x: (pageW - w) / 2, y: (pageH - h) / 2, width: w, height: h });
      }
      const data = await doc.save();
      const blob = new Blob([new Uint8Array(data)], { type: "application/pdf" });
      setItems([{ name: "images.pdf", blob, meta: `${files.length} pages` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Dropzone onFiles={onFiles} accept={{ "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] }} hint="PNG or JPG. Drag to add more, reorder before building." />
        {files.length > 0 && (
          <div className="surface mt-4 p-5">
            <div className="label mb-3">Order ({files.length})</div>
            <ul className="divide-y divide-[var(--color-border)]/60">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-3 py-2">
                  <span className="font-mono text-xs text-[var(--color-text-dim)] w-6">{i + 1}</span>
                  <span className="flex-1 truncate text-sm">{f.name}</span>
                  <button onClick={() => move(i, -1)} className="btn btn-ghost px-2 py-1 text-xs">↑</button>
                  <button onClick={() => move(i, 1)} className="btn btn-ghost px-2 py-1 text-xs">↓</button>
                  <button onClick={() => remove(i)} className="btn btn-ghost px-2 py-1 text-xs">✕</button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setFiles([])} disabled={busy}>Clear</button>
              <button className="btn btn-primary" onClick={build} disabled={busy}>
                {busy ? "Building…" : "Build PDF"}
              </button>
            </div>
          </div>
        )}
        <ResultList items={items} onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5">
        <div className="label mb-2">Page size</div>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-white/[0.03] p-1">
          {(["auto", "a4", "letter"] as PageSize[]).map((p) => (
            <button
              key={p}
              onClick={() => setPageSize(p)}
              className={`rounded-md py-2 text-xs uppercase tracking-wider ${
                pageSize === p
                  ? "bg-[var(--color-accent)] text-[oklch(15%_0.05_145)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
