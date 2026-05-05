"use client";

import { useDropzone, type Accept } from "react-dropzone";
import clsx from "clsx";

export default function Dropzone({
  onFiles,
  accept,
  multiple = true,
  hint,
  disabled = false,
  compact = false,
}: {
  onFiles: (files: File[]) => void;
  accept?: Accept;
  multiple?: boolean;
  hint?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: onFiles,
    accept,
    multiple,
    disabled,
    noClick: true,
    noKeyboard: true,
  });

  const stopPropClick = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      {...getRootProps()}
      className={clsx(
        "relative grid place-items-center rounded-2xl border-2 border-dashed text-center transition",
        compact ? "px-6 py-8" : "px-8 py-14",
        disabled
          ? "cursor-not-allowed border-[var(--color-border)] opacity-60"
          : "cursor-pointer",
        !disabled && isDragActive
          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] scale-[1.005]"
          : "border-[var(--color-border-strong)] hover:border-[var(--color-text-muted)] hover:bg-white/[0.02]",
      )}
      onClick={disabled ? undefined : open}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[oklch(60%_0.2_280)] opacity-20 blur-xl" />
          <div className="relative grid h-full w-full place-items-center rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)]">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
              <path d="M5 21h14" />
            </svg>
          </div>
        </div>

        <div className={clsx("display", compact ? "text-xl" : "text-2xl")}>
          {isDragActive
            ? "Drop to begin"
            : multiple
              ? "Drag files or use the button"
              : "Drag a file or use the button"}
        </div>

        <div
          onClick={stopPropClick}
          className="flex flex-wrap items-center justify-center gap-2 pt-1"
        >
          <button
            type="button"
            onClick={open}
            disabled={disabled}
            className="btn btn-primary"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Browse {multiple ? "files" : "file"}
          </button>
          {multiple && (
            <span className="pill">Batch supported</span>
          )}
        </div>

        {hint && (
          <div className="max-w-md text-sm text-[var(--color-text-dim)]">
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}
