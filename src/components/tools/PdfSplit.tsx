"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { replaceExt } from "@/lib/format";

function parseRanges(input: string, total: number): number[][] {
  return input
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      if (part.includes("-")) {
        const [a, b] = part.split("-").map((n) => parseInt(n.trim(), 10));
        const lo = Math.max(1, Math.min(a, b));
        const hi = Math.min(total, Math.max(a, b));
        return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i - 1);
      }
      const n = parseInt(part, 10);
      return n >= 1 && n <= total ? [n - 1] : [];
    })
    .filter((arr) => arr.length > 0);
}

export default function PdfSplit() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [ranges, setRanges] = useState("1-1,2-end");
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    const bytes = await f.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    setPageCount(doc.getPageCount());
  };

  const split = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const bytes = await file.arrayBuffer();
      const src = await PDFDocument.load(bytes);
      const total = src.getPageCount();
      const ranged = ranges.replace(/end/gi, String(total));
      const groups = parseRanges(ranged, total);
      const out: ResultItem[] = [];
      for (let i = 0; i < groups.length; i++) {
        const target = await PDFDocument.create();
        const pages = await target.copyPages(src, groups[i]);
        pages.forEach((p) => target.addPage(p));
        const data = await target.save();
        out.push({
          name: replaceExt(file.name, `part-${i + 1}.pdf`),
          blob: new Blob([new Uint8Array(data)], { type: "application/pdf" }),
          meta: `${groups[i].length} pages`,
        });
      }
      setItems(out);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        {!file && <Dropzone onFiles={onFiles} accept={{ "application/pdf": [".pdf"] }} multiple={false} hint="One PDF" />}
        {file && (
          <div className="surface p-5">
            <div className="label mb-1">File</div>
            <div className="display text-xl">{file.name}</div>
            <div className="mt-1 text-xs text-[var(--color-text-dim)]">{pageCount} pages</div>
            <div className="mt-5">
              <div className="label mb-2">Page ranges</div>
              <textarea
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                className="input font-mono"
                rows={3}
                placeholder="e.g. 1-3, 4-6, 7-end"
              />
              <p className="mt-2 text-xs text-[var(--color-text-dim)]">
                Comma or newline-separated. Use <code>end</code> for the last page.
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => { setFile(null); setItems([]); }} disabled={busy}>New file</button>
              <button className="btn btn-primary" onClick={split} disabled={busy}>{busy ? "Splitting…" : "Split"}</button>
            </div>
          </div>
        )}
        <ResultList items={items} zipName="split.zip" onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5 text-sm text-[var(--color-text-muted)]">
        <div className="display mb-2 text-2xl text-[var(--color-text)]">Examples</div>
        <ul className="space-y-1 font-mono text-xs text-[var(--color-text-dim)]">
          <li>1-5</li>
          <li>1-3, 4-6, 7-end</li>
          <li>1, 3, 5, 7</li>
        </ul>
      </aside>
    </div>
  );
}
