"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ProcessingQueue, { type QueueItem } from "@/components/ProcessingQueue";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { replaceExt, formatBytes, pct } from "@/lib/format";

type Mode = "lossless" | "smart";
type OutputFormat = "auto" | "png" | "jpeg" | "webp";

const MAX_BYTES = 25 * 1024 * 1024;

let _id = 0;
const newId = () => `q-${++_id}-${Date.now()}`;

export default function ImageOptimizer() {
  const [mode, setMode] = useState<Mode>("lossless");
  const [format, setFormat] = useState<OutputFormat>("auto");
  const [quality, setQuality] = useState(82);
  const [maxDim, setMaxDim] = useState(0);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState(false);

  const updateQueueItem = (id: string, patch: Partial<QueueItem>) =>
    setQueue((q) => q.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const onFiles = async (files: File[]) => {
    const accepted = files.filter((f) => {
      if (f.size > MAX_BYTES) return false;
      return true;
    });
    const rejected = files.length - accepted.length;

    const newItems: QueueItem[] = accepted.map((f) => ({
      id: newId(),
      name: f.name,
      size: f.size,
      preview: URL.createObjectURL(f),
      status: "queued",
    }));

    setQueue((q) => [...q, ...newItems]);
    if (rejected > 0) {
      // Show inline as a transient error row
      setQueue((q) => [
        ...q,
        {
          id: newId(),
          name: `${rejected} file(s) skipped`,
          size: 0,
          status: "error",
          message: `Over ${MAX_BYTES / 1024 / 1024} MB limit`,
        },
      ]);
    }

    setBusy(true);
    try {
      for (let i = 0; i < accepted.length; i++) {
        const file = accepted[i];
        const item = newItems[i];
        await processOne(file, item);
      }
    } finally {
      setBusy(false);
    }
  };

  const processOne = async (file: File, item: QueueItem) => {
    updateQueueItem(item.id, { status: "processing" });
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("mode", mode);
      form.set("format", format);
      if (mode === "smart") form.set("quality", String(quality));
      if (maxDim > 0) form.set("maxDim", String(maxDim));

      const res = await fetch("/api/optimize", { method: "POST", body: form });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const ext = res.headers.get("x-output-ext") ?? "bin";
      const name = replaceExt(file.name, ext);

      updateQueueItem(item.id, {
        status: "done",
        message:
          file.size > 0
            ? `${formatBytes(blob.size)} · ${pct(file.size, blob.size)}`
            : formatBytes(blob.size),
      });

      setItems((prev) => [
        {
          name,
          blob,
          before: file.size,
          preview: URL.createObjectURL(blob),
          meta: mode === "lossless" ? "lossless" : `q${quality}`,
        },
        ...prev,
      ]);
    } catch (err) {
      updateQueueItem(item.id, {
        status: "error",
        message: err instanceof Error ? err.message : "Failed",
      });
    }
  };

  const removeQueued = (id: string) =>
    setQueue((q) => q.filter((it) => it.id !== id));

  const clearAll = () => {
    setQueue([]);
    setItems([]);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Dropzone
          onFiles={onFiles}
          accept={{ "image/*": [] }}
          disabled={busy}
          hint={
            mode === "lossless"
              ? "Lossless mode preserves every pixel. Re-encodes with optimal compression."
              : "Smart mode lets you trade size for quality."
          }
        />

        <ProcessingQueue items={queue} onRemove={removeQueued} />

        {(queue.length > 0 || items.length > 0) && (
          <div className="mt-3 flex justify-end">
            <button className="btn btn-ghost" onClick={clearAll} disabled={busy}>
              Clear all
            </button>
          </div>
        )}

        <ResultList
          items={items}
          zipName="optimized.zip"
          onClear={() => setItems([])}
        />
      </div>

      <aside className="surface h-fit p-5 space-y-5">
        <div>
          <div className="label mb-2">Mode</div>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-white/[0.03] p-1">
            {(["lossless", "smart"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={busy}
                className={`rounded-md py-2 text-xs uppercase tracking-wider disabled:opacity-50 ${
                  mode === m
                    ? "bg-[var(--color-accent)] text-[oklch(15%_0.05_145)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {m === "lossless" ? "Lossless" : "Smart"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-dim)]">
            {mode === "lossless"
              ? "Pixel-perfect. Best for graphics, screenshots, art."
              : "Lossy. Smaller files, slight quality drop. Best for photos."}
          </p>
        </div>

        <div>
          <div className="label mb-2">Output format</div>
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-white/[0.03] p-1">
            {(["auto", "png", "jpeg", "webp"] as OutputFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                disabled={busy}
                className={`rounded-md py-2 text-[11px] uppercase tracking-wider disabled:opacity-50 ${
                  format === f
                    ? "bg-[var(--color-accent)] text-[oklch(15%_0.05_145)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-dim)]">
            {format === "auto"
              ? "Keep the original format."
              : format === "webp"
                ? "WebP — best compression for web."
                : format === "png"
                  ? "PNG — lossless raster format."
                  : "JPEG — universal photo format."}
          </p>
        </div>

        {mode === "smart" && (
          <div>
            <div className="label mb-2">Quality</div>
            <div className="flex items-baseline justify-between">
              <span className="display text-3xl">{quality}</span>
              <span className="text-xs text-[var(--color-text-dim)]">
                / 100
              </span>
            </div>
            <input
              type="range"
              min={40}
              max={100}
              step={1}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--color-accent)]"
              disabled={busy}
            />
          </div>
        )}

        <div>
          <div className="label mb-2">Max dimension</div>
          <div className="flex items-baseline justify-between">
            <span className="display text-3xl">{maxDim || "—"}</span>
            <span className="text-xs text-[var(--color-text-dim)]">
              {maxDim ? "px" : "no limit"}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={6000}
            step={100}
            value={maxDim}
            onChange={(e) => setMaxDim(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--color-accent)]"
            disabled={busy}
          />
          <p className="mt-2 text-xs text-[var(--color-text-dim)]">
            Resize the longest side. Set to 0 to keep original dimensions.
          </p>
        </div>

        <div className="text-xs text-[var(--color-text-dim)]">
          <p>Powered by Sharp on the server. Files capped at 25 MB.</p>
        </div>
      </aside>
    </div>
  );
}
