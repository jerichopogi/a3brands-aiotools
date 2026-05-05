"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { replaceExt } from "@/lib/format";

export default function DocxToPdf() {
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFiles = async (files: File[]) => {
    setError(null);
    for (const file of files) {
      setBusy(file.name);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/docx-to-pdf", { method: "POST", body: fd });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const blob = await res.blob();
        setItems((prev) => [
          {
            name: replaceExt(file.name, "pdf"),
            blob,
            before: file.size,
          },
          ...prev,
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Conversion failed");
      }
    }
    setBusy(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Dropzone
          onFiles={onFiles}
          accept={{ "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] }}
          hint=".docx files. Sent to a server route for layout."
        />
        {busy && (
          <div className="surface mt-4 flex items-center gap-3 p-4 text-sm">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-[var(--color-accent)]" />
            Converting <span className="font-mono">{busy}</span>…
          </div>
        )}
        {error && (
          <div className="surface mt-4 border-[var(--color-danger)]/40 p-4 text-sm">
            <div className="label mb-1 text-[var(--color-danger)]">Error</div>
            {error}
          </div>
        )}
        <ResultList items={items} zipName="docx-pdfs.zip" onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5 text-sm text-[var(--color-text-muted)]">
        <div className="display mb-2 text-2xl text-[var(--color-text)]">Renders</div>
        <p className="text-xs text-[var(--color-text-dim)]">
          Headings, paragraphs, lists, bold/italic, and images carry over. Complex
          formatting (tables, footnotes, columns) flattens to body text.
        </p>
      </aside>
    </div>
  );
}
