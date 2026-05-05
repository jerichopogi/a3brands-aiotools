"use client";

import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { replaceExt } from "@/lib/format";

export default function PdfRotate() {
  const [angle, setAngle] = useState<90 | 180 | 270>(90);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: File[]) => {
    setBusy(true);
    try {
      const out: ResultItem[] = [];
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        doc.getPages().forEach((p) => {
          const cur = p.getRotation().angle;
          p.setRotation(degrees((cur + angle) % 360));
        });
        const data = await doc.save();
        out.push({
          name: replaceExt(file.name, `rot${angle}.pdf`),
          blob: new Blob([new Uint8Array(data)], { type: "application/pdf" }),
          before: file.size,
          meta: `+${angle}°`,
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
        <Dropzone onFiles={onFiles} accept={{ "application/pdf": [".pdf"] }} hint="Rotates every page in each PDF" />
        {busy && <div className="surface mt-4 p-4 text-sm">Rotating…</div>}
        <ResultList items={items} zipName="rotated.zip" onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5">
        <div className="label mb-2">Rotation</div>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-white/[0.03] p-1">
          {([90, 180, 270] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAngle(a)}
              className={`rounded-md py-2 text-xs uppercase tracking-wider ${
                angle === a
                  ? "bg-[var(--color-accent)] text-[oklch(15%_0.05_145)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {a}°
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
