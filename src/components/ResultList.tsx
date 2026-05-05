"use client";

import { downloadBlob, formatBytes, pct } from "@/lib/format";
import JSZip from "jszip";

export interface ResultItem {
  name: string;
  blob: Blob;
  before?: number;
  preview?: string;
  meta?: string;
}

export default function ResultList({
  items,
  zipName = "aio-converter-output.zip",
  onClear,
}: {
  items: ResultItem[];
  zipName?: string;
  onClear?: () => void;
}) {
  if (items.length === 0) return null;

  const downloadAllZip = async () => {
    const zip = new JSZip();
    items.forEach((it) => zip.file(it.name, it.blob));
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, zipName);
  };

  return (
    <div className="surface mt-6 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="label">Output</div>
          <div className="display text-2xl">{items.length} {items.length === 1 ? "file" : "files"} ready</div>
        </div>
        <div className="flex gap-2">
          {onClear && (
            <button className="btn btn-ghost" onClick={onClear}>Clear</button>
          )}
          {items.length > 1 && (
            <button className="btn btn-primary" onClick={downloadAllZip}>
              Download .zip
            </button>
          )}
        </div>
      </div>
      <ul className="divide-y divide-[var(--color-border)]/60">
        {items.map((it, idx) => (
          <li key={`${it.name}-${idx}`} className="flex items-center gap-4 py-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
              {it.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-mono text-[10px] text-[var(--color-text-dim)]">FILE</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{it.name}</div>
              <div className="font-mono text-[11px] text-[var(--color-text-dim)]">
                {formatBytes(it.blob.size)}
                {typeof it.before === "number" && it.before > 0 && (
                  <> · was {formatBytes(it.before)} · {pct(it.before, it.blob.size)}</>
                )}
                {it.meta && <> · {it.meta}</>}
              </div>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => downloadBlob(it.blob, it.name)}
            >
              Download
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
