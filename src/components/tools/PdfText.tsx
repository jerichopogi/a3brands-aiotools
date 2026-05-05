"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { loadPdfJs } from "@/lib/pdf/pdfjs";
import { replaceExt } from "@/lib/format";

export default function PdfText() {
  const [items, setItems] = useState<ResultItem[]>([]);
  const [preview, setPreview] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: File[]) => {
    setBusy(true);
    try {
      const pdfjs = await loadPdfJs();
      const out: ResultItem[] = [];
      for (const file of files) {
        const data = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data }).promise;
        const chunks: string[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const text = await page.getTextContent();
          const pageStr = text.items
            .map((it) => ("str" in it ? it.str : ""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          chunks.push(`--- Page ${i} ---\n${pageStr}`);
        }
        const fullText = chunks.join("\n\n");
        const blob = new Blob([fullText], { type: "text/plain" });
        out.push({
          name: replaceExt(file.name, "txt"),
          blob,
          before: file.size,
          meta: `${doc.numPages} pages`,
        });
        if (out.length === 1) setPreview(fullText.slice(0, 3000));
      }
      setItems((prev) => [...out, ...prev]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Dropzone onFiles={onFiles} accept={{ "application/pdf": [".pdf"] }} hint="Selectable text only — scanned PDFs need OCR" />
        {busy && <div className="surface mt-4 p-4 text-sm">Extracting…</div>}
        {preview && (
          <div className="surface mt-4 p-5">
            <div className="label mb-2">Preview (first 3000 chars)</div>
            <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap font-mono text-xs text-[var(--color-text-muted)]">
              {preview}
            </pre>
          </div>
        )}
        <ResultList items={items} zipName="extracted-text.zip" onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5 text-sm text-[var(--color-text-muted)]">
        <div className="display mb-2 text-2xl text-[var(--color-text)]">Heads up</div>
        <p className="text-xs text-[var(--color-text-dim)]">
          PDFs from scans are images, not text. They need OCR (Tesseract is on the
          roadmap if you want it).
        </p>
      </aside>
    </div>
  );
}
