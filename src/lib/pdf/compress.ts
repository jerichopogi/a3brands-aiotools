"use client";

import { PDFDocument } from "pdf-lib";
import { loadPdfJs } from "./pdfjs";
import { canvasToBlob } from "@/lib/image/canvas";

export interface CompressOptions {
  /** Desired maximum output size in bytes. The tuner stops as soon as it lands under this. */
  targetBytes: number;
  /** Initial render scale (higher = sharper, bigger). Swept downward if needed. */
  scale: number;
  /** Lowest render scale the tuner will fall back to before giving up. */
  minScale?: number;
  onProgress?: (message: string) => void;
}

export interface CompressResult {
  blob: Blob;
  pages: number;
  /** JPEG quality (0–1) of the chosen result. */
  quality: number;
  /** Render scale of the chosen result. */
  scale: number;
  /** True when the output landed at or under the target size. */
  underTarget: boolean;
  /** True when rasterizing couldn't beat the original, so the original was returned untouched. */
  unchanged: boolean;
}

// JPEG quality ladder, tried high → low at each scale before stepping the scale down.
const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52, 0.42, 0.32] as const;
const SCALE_STEP = 0.5;

interface PageDim {
  w: number;
  h: number;
}

async function buildPdf(jpegs: Uint8Array[], dims: PageDim[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (let i = 0; i < jpegs.length; i++) {
    const img = await out.embedJpg(jpegs[i]);
    // Page keeps its original point size; the higher-res JPEG is drawn to fill it,
    // so effective DPI rises with scale while physical dimensions stay intact.
    const page = out.addPage([dims[i].w, dims[i].h]);
    page.drawImage(img, { x: 0, y: 0, width: dims[i].w, height: dims[i].h });
  }
  return out.save();
}

async function encodeCanvases(
  canvases: HTMLCanvasElement[],
  quality: number,
): Promise<Uint8Array[]> {
  const jpegs: Uint8Array[] = [];
  for (const canvas of canvases) {
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    jpegs.push(new Uint8Array(await blob.arrayBuffer()));
  }
  return jpegs;
}

/**
 * Rasterize every page to JPEG and rebuild the PDF, auto-tuning quality (then scale)
 * until the output fits under `targetBytes`. Always returns the smallest result it found,
 * flagging whether the target was actually met.
 */
export async function compressPdf(
  file: File,
  opts: CompressOptions,
): Promise<CompressResult> {
  const pdfjs = await loadPdfJs();
  const originalSize = file.size;
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const numPages = doc.numPages;
  const minScale = opts.minScale ?? 1;

  let best: { bytes: Uint8Array; quality: number; scale: number } | null = null;

  for (let scale = opts.scale; scale >= minScale - 1e-9; scale -= SCALE_STEP) {
    // Render all pages once per scale; quality sweeps re-encode the same canvases (cheap).
    const canvases: HTMLCanvasElement[] = [];
    const dims: PageDim[] = [];
    for (let i = 1; i <= numPages; i++) {
      opts.onProgress?.(`Rendering page ${i}/${numPages} @ ${scale.toFixed(1)}×`);
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      dims.push({ w: base.width, h: base.height });

      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context not available");
      // JPEG has no alpha — paint white so transparent PDFs don't turn black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      canvases.push(canvas);
    }

    for (const quality of QUALITY_STEPS) {
      opts.onProgress?.(
        `Encoding @ ${scale.toFixed(1)}× · q${Math.round(quality * 100)}`,
      );
      const jpegs = await encodeCanvases(canvases, quality);
      const bytes = await buildPdf(jpegs, dims);

      if (!best || bytes.length < best.bytes.length) {
        best = { bytes, quality, scale };
      }
      // Only accept early if it both fits the target and actually beats the original.
      if (bytes.length <= opts.targetBytes && bytes.length < originalSize) {
        return {
          blob: new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
          pages: numPages,
          quality,
          scale,
          underTarget: true,
          unchanged: false,
        };
      }
    }

    // Release this scale's canvases before rendering the next (smaller) pass.
    canvases.length = 0;
  }

  // If rasterizing never beat the original, return the original untouched —
  // a "compressor" should never hand back a bigger file.
  if (!best || best.bytes.length >= originalSize) {
    return {
      blob: file,
      pages: numPages,
      quality: 1,
      scale: opts.scale,
      underTarget: originalSize <= opts.targetBytes,
      unchanged: true,
    };
  }

  // Target unreachable, but we did shrink it — hand back the smallest result.
  return {
    blob: new Blob([new Uint8Array(best.bytes)], { type: "application/pdf" }),
    pages: numPages,
    quality: best.quality,
    scale: best.scale,
    underTarget: false,
    unchanged: false,
  };
}
