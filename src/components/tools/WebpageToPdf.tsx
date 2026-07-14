"use client";

import { useState } from "react";
import ResultList, { type ResultItem } from "@/components/ResultList";

type Format = "A4" | "Letter";

export default function WebpageToPdf() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<Format>("A4");
  const [landscape, setLandscape] = useState(false);
  const [printBackground, setPrintBackground] = useState(true);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const generate = async () => {
    const finalUrl = normalizeUrl(url);
    if (!finalUrl) {
      setError("Enter a webpage URL first.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/url-to-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: finalUrl, format, landscape, printBackground }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      let host = finalUrl;
      try {
        host = new URL(finalUrl).hostname.replace(/^www\./, "");
      } catch {
        /* keep raw url as fallback name */
      }
      setItems((prev) => [
        { name: `${host}.pdf`, blob, meta: `${format}${landscape ? " · landscape" : ""}` },
        ...prev,
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rendering failed");
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !busy) generate();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="surface p-5">
          <label className="label mb-2 block" htmlFor="wp-url">
            Webpage URL
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="wp-url"
              type="url"
              inputMode="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={busy}
              className="min-w-0 flex-1 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)] disabled:opacity-60"
            />
            <button
              className="btn btn-primary shrink-0"
              onClick={generate}
              disabled={busy}
            >
              {busy ? "Rendering…" : "Generate PDF"}
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--color-text-dim)]">
            The page is loaded by a headless Chrome on the server and printed to
            PDF. Public http/https pages only.
          </p>
        </div>

        {busy && (
          <div className="surface mt-4 flex items-center gap-3 p-4 text-sm">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-[var(--color-accent)]" />
            Loading the page and rendering…
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
          zipName="webpages.zip"
          onClear={() => setItems([])}
        />
      </div>

      <aside className="surface h-fit p-5 space-y-5">
        <div>
          <div className="label mb-2">Page size</div>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-white/[0.03] p-1">
            {(["A4", "Letter"] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                disabled={busy}
                className={`rounded-md py-2 text-xs uppercase tracking-wider disabled:opacity-50 ${
                  format === f
                    ? "bg-[var(--color-accent)] text-[oklch(15%_0.05_145)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Landscape</span>
          <input
            type="checkbox"
            checked={landscape}
            onChange={(e) => setLandscape(e.target.checked)}
            disabled={busy}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
        </label>

        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Print background graphics</span>
          <input
            type="checkbox"
            checked={printBackground}
            onChange={(e) => setPrintBackground(e.target.checked)}
            disabled={busy}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
        </label>

        <div className="text-xs text-[var(--color-text-dim)]">
          <p>
            Best for articles, docs, and receipts. Pages behind logins or heavy
            anti-bot protection may not render.
          </p>
        </div>
      </aside>
    </div>
  );
}
