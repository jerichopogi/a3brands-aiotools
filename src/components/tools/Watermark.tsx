"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { canvasToBlob, fileToImage } from "@/lib/image/canvas";
import { replaceExt } from "@/lib/format";

type Position = "tl" | "tr" | "bl" | "br" | "center";
const POSITIONS: { key: Position; label: string }[] = [
  { key: "tl", label: "Top L" },
  { key: "tr", label: "Top R" },
  { key: "center", label: "Center" },
  { key: "bl", label: "Bot L" },
  { key: "br", label: "Bot R" },
];

export default function Watermark() {
  const [text, setText] = useState("© A3 BRANDS");
  const [opacity, setOpacity] = useState(0.6);
  const [size, setSize] = useState(5);
  const [position, setPosition] = useState<Position>("br");
  const [items, setItems] = useState<ResultItem[]>([]);

  const onFiles = async (files: File[]) => {
    const out: ResultItem[] = [];
    for (const file of files) {
      const img = await fileToImage(file);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(14, Math.round((Math.min(canvas.width, canvas.height) * size) / 100));
      ctx.font = `600 ${fontSize}px ${"Inter, system-ui, sans-serif"}`;
      ctx.fillStyle = `rgba(255,255,255,${opacity})`;
      ctx.strokeStyle = `rgba(0,0,0,${opacity * 0.6})`;
      ctx.lineWidth = Math.max(1, fontSize / 30);

      const pad = Math.round(fontSize * 0.6);
      const m = ctx.measureText(text);
      const tw = m.width;
      const th = fontSize;
      let x = pad, y = pad + th;
      if (position === "tr") x = canvas.width - tw - pad;
      else if (position === "bl") y = canvas.height - pad;
      else if (position === "br") { x = canvas.width - tw - pad; y = canvas.height - pad; }
      else if (position === "center") { x = (canvas.width - tw) / 2; y = (canvas.height + th) / 2; }

      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);

      const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await canvasToBlob(canvas, mime, mime === "image/jpeg" ? 0.92 : undefined);
      out.push({
        name: replaceExt(file.name, mime === "image/png" ? "wm.png" : "wm.jpg"),
        blob,
        before: file.size,
        preview: URL.createObjectURL(blob),
      });
    }
    setItems((prev) => [...out, ...prev]);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Dropzone onFiles={onFiles} accept={{ "image/*": [] }} hint="Watermarks all dropped files at once" />
        <ResultList items={items} zipName="watermarked.zip" onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5 space-y-5">
        <label className="block">
          <div className="label mb-1">Text</div>
          <input value={text} onChange={(e) => setText(e.target.value)} className="input" />
        </label>
        <div>
          <div className="label mb-2">Position</div>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-white/[0.03] p-1">
            {POSITIONS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPosition(p.key)}
                className={`rounded-md py-2 text-xs ${
                  position === p.key
                    ? "bg-[var(--color-accent)] text-[oklch(15%_0.05_145)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="label mb-2">Opacity</div>
          <input type="range" min={10} max={100} value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            className="w-full accent-[var(--color-accent)]" />
        </div>
        <div>
          <div className="label mb-2">Size</div>
          <input type="range" min={2} max={15} value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]" />
        </div>
      </aside>
    </div>
  );
}
