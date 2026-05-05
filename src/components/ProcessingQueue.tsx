"use client";

import { formatBytes } from "@/lib/format";

export type QueueStatus = "queued" | "processing" | "done" | "error";

export interface QueueItem {
  id: string;
  name: string;
  size: number;
  preview?: string;
  status: QueueStatus;
  message?: string;
}

export default function ProcessingQueue({
  items,
  title = "Processing",
  onRemove,
}: {
  items: QueueItem[];
  title?: string;
  onRemove?: (id: string) => void;
}) {
  if (items.length === 0) return null;

  const counts = items.reduce(
    (acc, it) => {
      acc[it.status] += 1;
      return acc;
    },
    { queued: 0, processing: 0, done: 0, error: 0 } as Record<QueueStatus, number>,
  );
  const totalDone = counts.done + counts.error;

  return (
    <div className="surface mt-4 overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="label">{title}</span>
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            {totalDone}/{items.length}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {counts.processing > 0 && (
            <span className="flex items-center gap-1.5 text-[var(--color-accent)]">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[var(--color-accent)]" />
              {counts.processing} working
            </span>
          )}
          {counts.queued > 0 && (
            <span className="text-[var(--color-text-dim)]">
              {counts.queued} queued
            </span>
          )}
          {counts.error > 0 && (
            <span className="text-[var(--color-danger)]">
              {counts.error} failed
            </span>
          )}
        </div>
      </div>

      {/* Top progress bar */}
      <div className="h-1 bg-white/[0.04]">
        <div
          className="h-full bg-[var(--color-accent)] transition-[width] duration-500"
          style={{ width: `${(totalDone / items.length) * 100}%` }}
        />
      </div>

      <ul className="max-h-80 divide-y divide-[var(--color-border)]/60 overflow-y-auto">
        {items.map((it) => (
          <li
            key={it.id}
            className="flex items-center gap-3 px-5 py-3 transition-opacity"
          >
            <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
              {it.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.preview}
                  alt=""
                  className={`h-full w-full object-cover transition ${
                    it.status === "done" ? "opacity-100" : "opacity-60"
                  }`}
                />
              ) : (
                <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
                  IMG
                </span>
              )}
              {it.status === "processing" && (
                <div className="pointer-events-none absolute inset-x-0 h-[2px] bg-gradient-to-b from-transparent via-[var(--color-accent)] to-transparent shadow-[0_0_8px_2px_var(--color-accent)] animate-scan-y" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{it.name}</div>
              <div className="font-mono text-[11px] text-[var(--color-text-dim)]">
                {formatBytes(it.size)}
                {it.message && <> · {it.message}</>}
              </div>
            </div>
            <StatusBadge status={it.status} />
            {onRemove && it.status === "queued" && (
              <button
                onClick={() => onRemove(it.id)}
                className="text-[var(--color-text-dim)] hover:text-[var(--color-danger)]"
                aria-label={`Remove ${it.name}`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: QueueStatus }) {
  if (status === "done") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] text-[oklch(15%_0.05_145)]">
        ✓
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-danger)] text-[10px] text-white">
        !
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="flex h-5 w-5 items-center justify-center">
        <Spinner />
      </span>
    );
  }
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
      Queued
    </span>
  );
}

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin text-[var(--color-accent)]"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
