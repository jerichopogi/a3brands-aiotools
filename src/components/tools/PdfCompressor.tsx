"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { compressPdf } from "@/lib/pdf/compress";
import { replaceExt, formatBytes } from "@/lib/format";

// Render-scale presets. Higher scale = sharper pages but larger files.
const PRESETS = [
  { key: "screen", label: "Screen", scale: 1, hint: "~72 dpi. Smallest — good for email and web viewing." },
  { key: "balanced", label: "Balanced", scale: 1.5, hint: "~108 dpi. Best size-to-clarity trade-off." },
  { key: "sharp", label: "Sharp", scale: 2, hint: "~144 dpi. Crisp text, larger files." },
] as const;

type PresetKey = (typeof PRESETS)[number]["key"];

const MB = 1024 * 1024;
const DEFAULT_TARGET_MB = 8;

export default function PdfCompressor() {
  const [preset, setPreset] = useState<PresetKey>("balanced");
  const [targetMb, setTargetMb] = useState(DEFAULT_TARGET_MB);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const onFiles = async (files: File[]) => {
    setError(null);
    const scale = PRESETS.find((p) => p.key === preset)!.scale;
    const targetBytes = targetMb * MB;

    for (const file of files) {
      setBusy(file.name);
      setProgress("Reading…");
      try {
        const result = await compressPdf(file, {
          targetBytes,
          scale,
          onProgress: setProgress,
        });

        const savedPct =
          file.size > 0
            ? Math.round(((file.size - result.blob.size) / file.size) * 100)
            : 0;

        let meta: string;
        let name: string;
        if (result.unchanged) {
          // Rasterizing couldn't beat the original; it was returned as-is.
          name = file.name;
          meta = result.underTarget
            ? `already under ${targetMb} MB — kept original (${result.pages}p)`
            : `couldn't shrink below original — kept original (${result.pages}p)`;
        } else {
          name = replaceExt(file.name, "pdf").replace(/\.pdf$/i, "-compressed.pdf");
          const fit = result.underTarget
            ? `under ${targetMb} MB`
            : `smallest possible — ${formatBytes(result.blob.size)}`;
          meta = `${result.pages}p · ${fit} · saved ${savedPct}%`;
        }

        setItems((prev) => [
          { name, blob: result.blob, before: file.size, meta },
          ...prev,
        ]);
      } catch (e) {
        setError(
          `${file.name}: ${e instanceof Error ? e.message : "Compression failed"}`,
        );
      }
    }
    setBusy(null);
    setProgress("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Dropzone
          onFiles={onFiles}
          accept={{ "application/pdf": [".pdf"] }}
          disabled={busy !== null}
          hint="PDFs are rasterized and re-encoded in your browser — files never leave the device."
        />

        {busy && (
          <div className="surface mt-4 flex items-center gap-3 p-4 text-sm">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-[var(--color-accent)]" />
            <span className="min-w-0 flex-1 truncate">
              Compressing <span className="font-mono">{busy}</span>
              {progress && <span className="text-[var(--color-text-dim)]"> · {progress}</span>}
            </span>
          </div>
        )}

        {error && (
          <div className="surface mt-4 border-[var(--color-danger)]/40 p-4 text-sm">
            <div className="label mb-1 text-[var(--color-danger)]">Error</div>
            {error}
          </div>
        )}

        <ResultList
          items={items}
          zipName="compressed-pdfs.zip"
          onClear={() => setItems([])}
        />
      </div>

      <aside className="surface h-fit p-5 space-y-5">
        <div>
          <div className="label mb-2">Target size</div>
          <div className="flex items-baseline justify-between">
            <span className="display text-3xl">{targetMb}</span>
            <span className="text-xs text-[var(--color-text-dim)]">MB max</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={targetMb}
            onChange={(e) => setTargetMb(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--color-accent)]"
            disabled={busy !== null}
          />
          <p className="mt-2 text-xs text-[var(--color-text-dim)]">
            Quality is auto-tuned down until the output fits under this size.
          </p>
        </div>

        <div>
          <div className="label mb-2">Resolution</div>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-white/[0.03] p-1">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                disabled={busy !== null}
                className={`rounded-md py-2 text-xs uppercase tracking-wider disabled:opacity-50 ${
                  preset === p.key
                    ? "bg-[var(--color-accent)] text-[oklch(15%_0.05_145)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-dim)]">
            {PRESETS.find((p) => p.key === preset)!.hint}
          </p>
        </div>

        <div className="text-xs text-[var(--color-text-dim)]">
          <p>
            Pages become images, so text is no longer selectable. Ideal for
            scanned or image-heavy PDFs that are too large to share.
          </p>
        </div>
      </aside>
    </div>
  );
}
