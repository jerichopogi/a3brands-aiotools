"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { canvasToBlob, drawTo, fileToImage } from "@/lib/image/canvas";

export default function ExifStripper() {
  const [items, setItems] = useState<ResultItem[]>([]);

  const onFiles = async (files: File[]) => {
    const out: ResultItem[] = [];
    for (const file of files) {
      const img = await fileToImage(file);
      const canvas = drawTo(img, img.naturalWidth, img.naturalHeight);
      const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await canvasToBlob(canvas, mime, mime === "image/jpeg" ? 0.95 : undefined);
      out.push({
        name: file.name,
        blob,
        before: file.size,
        preview: URL.createObjectURL(blob),
        meta: "EXIF stripped",
      });
    }
    setItems((prev) => [...out, ...prev]);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Dropzone
          onFiles={onFiles}
          accept={{ "image/*": [] }}
          hint="Re-encodes through canvas — strips EXIF, GPS, and embedded color profiles"
        />
        <ResultList items={items} zipName="clean.zip" onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5 text-sm text-[var(--color-text-muted)]">
        <div className="display mb-2 text-2xl text-[var(--color-text)]">Why strip EXIF?</div>
        <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--color-text-dim)]">
          <li>Removes camera make/model</li>
          <li>Removes GPS coordinates</li>
          <li>Removes timestamps</li>
          <li>Often shrinks the file 5–15%</li>
        </ul>
      </aside>
    </div>
  );
}
