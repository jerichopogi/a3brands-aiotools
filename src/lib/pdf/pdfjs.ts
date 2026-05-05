"use client";

import type * as PdfJs from "pdfjs-dist";

let mod: typeof PdfJs | null = null;

export async function loadPdfJs(): Promise<typeof PdfJs> {
  if (mod) return mod;
  const m = await import("pdfjs-dist");
  // Pin worker URL to the exact bundled version so it never drifts from the API.
  m.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${m.version}/build/pdf.worker.min.mjs`;
  mod = m;
  return m;
}
