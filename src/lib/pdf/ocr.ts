"use client";

import type { DocxParagraph } from "@/lib/docx/build";
import { loadPdfJs } from "./pdfjs";

type CreateWorker = (typeof import("tesseract.js"))["createWorker"];
type TesseractWorker = Awaited<ReturnType<CreateWorker>>;

// ~180 DPI: enough detail for reliable OCR without oversized canvases.
const RENDER_SCALE = 2.5;

// Lazily created and kept warm across files — the language model (~10–15 MB)
// only downloads/initialises once per session, mirroring loadPdfJs().
let workerPromise: Promise<TesseractWorker> | null = null;
let progressSink: ((pct: number) => void) | null = null;

async function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then((tesseract) =>
      tesseract.createWorker("eng", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") progressSink?.(m.progress);
        },
      }),
    );
  }
  return workerPromise;
}

export interface OcrProgress {
  page: number;
  total: number;
  pct: number; // 0..1 within the current page
}

/** Splits a raw OCR text block into clean, single-line paragraphs. */
function textToParagraphs(text: string, pageIndex: number): DocxParagraph[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((block, idx) => ({
      text: block,
      pageBreakBefore: pageIndex > 0 && idx === 0,
    }));
}

/**
 * OCRs an image-based PDF: renders each page to a canvas with pdf.js, then
 * recognises text with tesseract.js. Fully on-device. Returns DOCX paragraphs.
 */
export async function ocrPdfToParagraphs(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<DocxParagraph[]> {
  const pdfjs = await loadPdfJs();
  const worker = await getWorker();
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;

  const paragraphs: DocxParagraph[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      onProgress?.({ page: i, total: doc.numPages, pct: 0 });
      progressSink = (pct) => onProgress?.({ page: i, total: doc.numPages, pct });

      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      await page.render({ canvasContext: ctx, viewport }).promise;

      const { data: result } = await worker.recognize(canvas);
      // Release the canvas backing store before the next page.
      canvas.width = 0;
      canvas.height = 0;

      paragraphs.push(...textToParagraphs(result.text, i - 1));
    }
  } finally {
    progressSink = null;
  }
  return paragraphs;
}
