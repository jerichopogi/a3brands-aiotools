"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { pdfToDocxParagraphs } from "@/lib/pdf/reconstruct";
import { ocrPdfToParagraphs } from "@/lib/pdf/ocr";
import { buildDocx } from "@/lib/docx/build";
import { replaceExt } from "@/lib/format";

// Below this many characters per page, a PDF is almost certainly image-based.
const MIN_CHARS_PER_PAGE = 40;

export default function PdfToDocx() {
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ocr, setOcr] = useState(false);

  const onFiles = async (files: File[]) => {
    setError(null);
    setNotice(null);
    const out: ResultItem[] = [];

    for (const file of files) {
      try {
        if (ocr) {
          const paragraphs = await ocrPdfToParagraphs(file, ({ page, total, pct }) =>
            setBusy(`${file.name} — OCR page ${page}/${total} (${Math.round(pct * 100)}%)`),
          );
          if (paragraphs.length === 0) {
            setError(`OCR found no text in ${file.name}.`);
            continue;
          }
          const blob = await buildDocx(paragraphs);
          out.push({
            name: replaceExt(file.name, "docx"),
            blob,
            before: file.size,
            meta: `OCR · ${paragraphs.length} blocks`,
          });
          continue;
        }

        const { paragraphs, pageCount, charCount } = await pdfToDocxParagraphs(
          file,
          (page, total) => setBusy(`${file.name} — page ${page}/${total}`),
        );

        if (charCount === 0) {
          setError(
            `${file.name} has no text layer — it's an image-based / scanned PDF. Turn on OCR mode above and drop it again.`,
          );
          continue;
        }
        if (charCount < MIN_CHARS_PER_PAGE * pageCount) {
          setNotice(
            `${file.name} looks image-based: only ${charCount} characters of real text were found across ${pageCount} page${pageCount === 1 ? "" : "s"}. The .docx below has just that text — turn on OCR mode and re-drop to read the rest.`,
          );
        }

        const blob = await buildDocx(paragraphs);
        out.push({
          name: replaceExt(file.name, "docx"),
          blob,
          before: file.size,
          meta: `${paragraphs.length} blocks · ${charCount} chars`,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Conversion failed");
      }
    }

    if (out.length) setItems((prev) => [...out, ...prev]);
    setBusy(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Dropzone
          onFiles={onFiles}
          accept={{ "application/pdf": [".pdf"] }}
          hint={
            ocr
              ? "OCR mode: each page is read as an image. Slower, first run downloads ~13 MB."
              : ".pdf files. Reconstructed in your browser — nothing is uploaded."
          }
        />
        {busy && (
          <div className="surface mt-4 flex items-center gap-3 p-4 text-sm">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-[var(--color-accent)]" />
            Converting <span className="font-mono">{busy}</span>…
          </div>
        )}
        {error && (
          <div className="surface mt-4 border-[var(--color-danger)]/40 p-4 text-sm">
            <div className="label mb-1 text-[var(--color-danger)]">Error</div>
            {error}
          </div>
        )}
        {notice && (
          <div className="surface mt-4 border-[var(--color-accent)]/40 p-4 text-sm">
            <div className="label mb-1 text-[var(--color-accent)]">Image-based PDF</div>
            {notice}
          </div>
        )}
        <ResultList items={items} zipName="pdf-docx.zip" onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5 space-y-5">
        <div>
          <div className="label mb-2">Mode</div>
          <button
            type="button"
            role="switch"
            aria-checked={ocr}
            onClick={() => setOcr((v) => !v)}
            className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors ${
              ocr
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                : "border-[var(--color-border)] hover:border-[var(--color-border)]/80"
            }`}
          >
            <span>
              <span className="block font-medium text-[var(--color-text)]">OCR mode</span>
              <span className="text-xs text-[var(--color-text-dim)]">
                For scanned / image PDFs
              </span>
            </span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                ocr ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  ocr ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </span>
          </button>
        </div>
        <div className="text-sm text-[var(--color-text-muted)]">
          <div className="display mb-2 text-2xl text-[var(--color-text)]">How it works</div>
          <p className="text-xs text-[var(--color-text-dim)]">
            Default mode reads an existing text layer and folds it back into
            paragraphs and headings — fast and fully on-device.
          </p>
          <p className="mt-3 text-xs text-[var(--color-text-dim)]">
            OCR mode renders each page to an image and recognises the characters —
            the only way to read scanned PDFs and flattened forms. Slower, and form
            layout (checkboxes, lines, columns) flattens to plain text.
          </p>
        </div>
      </aside>
    </div>
  );
}
