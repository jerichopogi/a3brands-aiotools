"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { replaceExt } from "@/lib/format";

type Scale = 2 | 3 | 4;

interface UpscaleError {
  message: string;
  hint?: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface ActiveJob {
  fileName: string;
  previewUrl: string;
  phase: "uploading" | "enhancing" | "downloading";
}

const HD_MAX_BYTES = 6 * 1024 * 1024;

const PHASE_COPY: Record<ActiveJob["phase"], { title: string; sub: string }> = {
  uploading: {
    title: "Uploading",
    sub: "Sending image to the GPU server",
  },
  enhancing: {
    title: "Enhancing with Real-ESRGAN",
    sub: "Reconstructing detail · usually 5–10 seconds",
  },
  downloading: {
    title: "Almost done",
    sub: "Pulling the upscaled image back",
  },
};

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function ImageUpscaler() {
  const [scale, setScale] = useState<Scale>(4);
  const [faceEnhance, setFaceEnhance] = useState(false);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [active, setActive] = useState<ActiveJob | null>(null);
  const [error, setError] = useState<UpscaleError | null>(null);
  const [busy, setBusy] = useState(false);

  const upscaleHd = async (file: File): Promise<void> => {
    if (file.size > HD_MAX_BYTES) {
      throw new Error(
        `${file.name} is over 6 MB. Keep uploads under 6 MB to control API costs.`,
      );
    }

    const previewUrl = URL.createObjectURL(file);
    setActive({ fileName: file.name, previewUrl, phase: "uploading" });

    const dataUri = await fileToDataUri(file);

    setActive((a) => (a ? { ...a, phase: "enhancing" } : a));
    const res = await fetch("/api/upscale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image: dataUri, scale, faceEnhance }),
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as
        | { error?: string; hint?: string; actionUrl?: string; actionLabel?: string }
        | null;
      const err: UpscaleError = {
        message: payload?.error ?? `HTTP ${res.status}`,
        hint: payload?.hint,
        actionUrl: payload?.actionUrl,
        actionLabel: payload?.actionLabel,
      };
      throw Object.assign(new Error(err.message), { upscaleError: err });
    }

    const { url } = (await res.json()) as { url: string };

    setActive((a) => (a ? { ...a, phase: "downloading" } : a));
    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error("Failed to download upscaled image");
    const blob = await imgRes.blob();

    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = URL.createObjectURL(blob);
    });

    setItems((prev) => [
      {
        name: replaceExt(file.name, `${scale}x.png`),
        blob,
        before: file.size,
        preview: URL.createObjectURL(blob),
        meta: dims.w
          ? `${scale}× · ${dims.w}×${dims.h}${faceEnhance ? " · face-enhanced" : ""}`
          : `${scale}×${faceEnhance ? " · face-enhanced" : ""}`,
      },
      ...prev,
    ]);

    URL.revokeObjectURL(previewUrl);
  };

  const onFiles = async (files: File[]) => {
    setError(null);
    setBusy(true);
    try {
      for (const file of files) await upscaleHd(file);
    } catch (e) {
      const tagged = (e as { upscaleError?: UpscaleError }).upscaleError;
      if (tagged) setError(tagged);
      else
        setError({
          message: e instanceof Error ? e.message : "Upscale failed",
        });
    } finally {
      setBusy(false);
      setActive(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Dropzone
          onFiles={onFiles}
          accept={{ "image/*": [] }}
          hint="Real-ESRGAN on a GPU server. Best on blurry photos and portraits. ~5–10s per image."
        />

        {active && <UpscaleLoader job={active} />}

        {error && (
          <div className="surface mt-4 border-[var(--color-danger)]/40 p-4 text-sm">
            <div className="label mb-1 text-[var(--color-danger)]">Error</div>
            <div className="font-medium">{error.message}</div>
            {error.hint && (
              <p className="mt-2 text-[var(--color-text-muted)]">{error.hint}</p>
            )}
            {error.actionUrl && (
              <a
                href={error.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[oklch(15%_0.05_145)] hover:opacity-90"
              >
                {error.actionLabel ?? "Open"} →
              </a>
            )}
          </div>
        )}

        <ResultList items={items} zipName="upscaled.zip" onClear={() => setItems([])} />
      </div>

      <aside className="surface h-fit p-5 space-y-5">
        <div>
          <div className="label mb-2">Scale</div>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-white/[0.03] p-1">
            {([2, 3, 4] as Scale[]).map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                disabled={busy}
                className={`rounded-md py-2 text-xs uppercase tracking-wider disabled:opacity-50 ${
                  scale === s
                    ? "bg-[var(--color-accent)] text-[oklch(15%_0.05_145)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span>
            <span className="block text-sm">Face enhance</span>
            <span className="block text-xs text-[var(--color-text-dim)]">
              Run GFPGAN on detected faces
            </span>
          </span>
          <input
            type="checkbox"
            checked={faceEnhance}
            onChange={(e) => setFaceEnhance(e.target.checked)}
            disabled={busy}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
        </label>

        <div className="space-y-2 text-xs text-[var(--color-text-dim)]">
          <p className="text-sm text-[var(--color-text-muted)]">
            <span className="font-mono">real-esrgan</span> — the gold standard
            for restoring blurry photos. Runs server-side on a GPU.
          </p>
          <p>Uploads are capped at 6 MB to keep API costs predictable.</p>
        </div>
      </aside>
    </div>
  );
}

function UpscaleLoader({ job }: { job: ActiveJob }) {
  const order: ActiveJob["phase"][] = ["uploading", "enhancing", "downloading"];
  const currentIdx = order.indexOf(job.phase);
  const copy = PHASE_COPY[job.phase];

  return (
    <div className="surface mt-4 overflow-hidden p-5 animate-glow-ring">
      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={job.previewUrl}
            alt=""
            className="h-full w-full object-cover opacity-70"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-accent)]/0 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 h-[2px] bg-gradient-to-b from-transparent via-[var(--color-accent)] to-transparent shadow-[0_0_12px_2px_var(--color-accent)] animate-scan-y" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-sm font-semibold">{copy.title}</h3>
            <span className="dots inline-flex gap-0.5">
              <span className="dot-bounce inline-block h-1 w-1 rounded-full bg-[var(--color-accent)]" />
              <span
                className="dot-bounce inline-block h-1 w-1 rounded-full bg-[var(--color-accent)]"
                style={{ animationDelay: "0.15s" }}
              />
              <span
                className="dot-bounce inline-block h-1 w-1 rounded-full bg-[var(--color-accent)]"
                style={{ animationDelay: "0.3s" }}
              />
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-dim)] truncate">
            {copy.sub} · {job.fileName}
          </p>

          {/* Phase track */}
          <div className="mt-4 flex items-center gap-2">
            {order.map((p, i) => {
              const done = i < currentIdx;
              const here = i === currentIdx;
              return (
                <div key={p} className="flex flex-1 items-center gap-2">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-mono transition-colors ${
                      done
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[oklch(15%_0.05_145)]"
                        : here
                          ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                          : "border-[var(--color-border)] text-[var(--color-text-dim)]"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  {i < order.length - 1 && (
                    <div className="relative h-px flex-1 overflow-hidden bg-[var(--color-border)]">
                      <div
                        className={`absolute inset-y-0 left-0 bg-[var(--color-accent)] transition-[width] duration-500 ${
                          done ? "w-full" : here ? "w-1/2" : "w-0"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Indeterminate shimmer bar */}
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.04]">
            <div className="relative h-full w-full">
              <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent animate-shimmer-x" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
