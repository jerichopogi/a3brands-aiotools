"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { formatBytes } from "@/lib/format";

export default function PdfMerge() {
  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState(false);

  const onFiles = (incoming: File[]) => {
    setFiles((prev) => [...prev, ...incoming.filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"))]);
  };

  const move = (i: number, dir: -1 | 1) => {
    setFiles((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const copy = [...arr];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  };

  const remove = (i: number) => setFiles((arr) => arr.filter((_, k) => k !== i));

  const merge = async () => {
    if (files.length < 2) return;
    setBusy(true);
    try {
      const out = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const src = await PDFDocument.load(bytes);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      const merged = await out.save();
      const blob = new Blob([new Uint8Array(merged)], { type: "application/pdf" });
      setItems([{ name: "merged.pdf", blob, meta: `${files.length} sources` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Dropzone onFiles={onFiles} accept={{ "application/pdf": [".pdf"] }} hint="Drop multiple PDFs, then reorder before merging" />
        {files.length > 0 && (
          <div className="surface mt-4 p-5">
            <div className="label mb-3">Order ({files.length})</div>
            <ul className="divide-y divide-[var(--color-border)]/60">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-3 py-2">
                  <span className="font-mono text-xs text-[var(--color-text-dim)] w-6">{i + 1}</span>
                  <span className="flex-1 truncate text-sm">{f.name}</span>
                  <span className="font-mono text-xs text-[var(--color-text-dim)]">{formatBytes(f.size)}</span>
                  <button onClick={() => move(i, -1)} className="btn btn-ghost px-2 py-1 text-xs">↑</button>
                  <button onClick={() => move(i, 1)} className="btn btn-ghost px-2 py-1 text-xs">↓</button>
                  <button onClick={() => remove(i)} className="btn btn-ghost px-2 py-1 text-xs">✕</button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setFiles([])} disabled={busy}>Clear</button>
              <button className="btn btn-primary" onClick={merge} disabled={busy || files.length < 2}>
                {busy ? "Merging…" : `Merge ${files.length}`}
              </button>
            </div>
          </div>
        )}
        <ResultList items={items} onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5 text-sm text-[var(--color-text-muted)]">
        <div className="display mb-2 text-2xl text-[var(--color-text)]">Lossless</div>
        <p className="text-xs text-[var(--color-text-dim)]">
          Pages are copied byte-for-byte. No re-rendering, no quality loss.
          Encrypted PDFs need to be unlocked first.
        </p>
      </aside>
    </div>
  );
}
