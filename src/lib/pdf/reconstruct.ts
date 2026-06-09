"use client";

import type { DocxParagraph } from "@/lib/docx/build";
import { loadPdfJs } from "./pdfjs";

/** Minimal shape of a pdf.js TextItem — avoids depending on its internal type path. */
interface PdfTextItem {
  str: string;
  transform: number[]; // [scaleX, skewY, skewX, scaleY, x, y]
  width: number;
  height: number;
}

interface Line {
  text: string;
  y: number; // baseline Y in PDF space (grows upward)
  size: number; // approx font height in pts
}

// Tuning heuristics for layout reconstruction.
const SAME_LINE_TOL = 0.5; // fraction of font height to treat items as one line
const SPACE_GAP = 0.25; // x-gap (× font height) that implies a word space
const PARA_GAP = 0.65; // extra leading (× line height) that starts a new paragraph
const H1_RATIO = 1.8;
const H2_RATIO = 1.45;
const H3_RATIO = 1.25;

function itemSize(it: PdfTextItem): number {
  return Math.hypot(it.transform[2], it.transform[3]) || it.height || 10;
}

function headingLevel(size: number, body: number): 1 | 2 | 3 | undefined {
  const ratio = size / body;
  if (ratio >= H1_RATIO) return 1;
  if (ratio >= H2_RATIO) return 2;
  if (ratio >= H3_RATIO) return 3;
  return undefined;
}

/** Joins items already known to share a line, inserting spaces across visual gaps. */
function joinLine(items: PdfTextItem[]): string {
  const ordered = [...items].sort((a, b) => a.transform[4] - b.transform[4]);
  let text = "";
  let prevRight: number | null = null;
  for (const it of ordered) {
    const x = it.transform[4];
    const size = itemSize(it);
    if (
      prevRight !== null &&
      x - prevRight > SPACE_GAP * size &&
      !text.endsWith(" ") &&
      !it.str.startsWith(" ")
    ) {
      text += " ";
    }
    text += it.str;
    prevRight = x + (it.width ?? 0);
  }
  return text.replace(/\s+/g, " ").trim();
}

/** Groups positioned text items into visual lines, top-to-bottom. */
function toLines(items: PdfTextItem[]): Line[] {
  const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5]);
  const groups: { items: PdfTextItem[]; y: number; size: number }[] = [];
  for (const it of sorted) {
    const y = it.transform[5];
    const size = itemSize(it);
    const last = groups[groups.length - 1];
    if (last && Math.abs(last.y - y) <= SAME_LINE_TOL * Math.max(last.size, size)) {
      last.items.push(it);
      last.size = Math.max(last.size, size);
    } else {
      groups.push({ items: [it], y, size });
    }
  }
  return groups
    .map((g) => ({ text: joinLine(g.items), y: g.y, size: g.size }))
    .filter((l) => l.text.length > 0);
}

/** Folds lines into paragraphs using vertical gaps and font-size shifts. */
function toParagraphs(lines: Line[]): DocxParagraph[] {
  if (lines.length === 0) return [];
  const sizes = lines.map((l) => l.size).sort((a, b) => a - b);
  const body = sizes[Math.floor(sizes.length / 2)] || 11;

  const paragraphs: DocxParagraph[] = [];
  let parts: string[] = [];
  let blockSize = lines[0].size;
  let prevY = lines[0].y;
  let prevSize = lines[0].size;

  const flush = () => {
    if (parts.length === 0) return;
    paragraphs.push({ text: parts.join(" "), heading: headingLevel(blockSize, body) });
    parts = [];
  };

  lines.forEach((line, i) => {
    const lineHeight = Math.max(line.size, prevSize, 1);
    const gap = i === 0 ? 0 : prevY - line.y;
    const bucketChanged =
      headingLevel(line.size, body) !== headingLevel(prevSize, body);
    const startNew = i === 0 || gap > (1 + PARA_GAP) * lineHeight || bucketChanged;

    if (startNew) {
      flush();
      blockSize = line.size;
    } else {
      blockSize = Math.max(blockSize, line.size);
    }
    parts.push(line.text);
    prevY = line.y;
    prevSize = line.size;
  });
  flush();
  return paragraphs;
}

export interface PdfReconstruction {
  paragraphs: DocxParagraph[];
  pageCount: number;
  /** Total characters of real text found across the whole document. */
  charCount: number;
}

/**
 * Extracts selectable text from a PDF and reconstructs it as DOCX paragraphs.
 * `charCount` near zero signals an image-based PDF (scan) that needs OCR.
 */
export async function pdfToDocxParagraphs(
  file: File,
  onPage?: (page: number, total: number) => void,
): Promise<PdfReconstruction> {
  const pdfjs = await loadPdfJs();
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;

  const all: DocxParagraph[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onPage?.(i, doc.numPages);
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items: PdfTextItem[] = content.items
      .filter((it): it is Extract<typeof it, { str: string }> => "str" in it)
      .map((it) => ({
        str: it.str,
        transform: it.transform,
        width: it.width,
        height: it.height,
      }));
    const paragraphs = toParagraphs(toLines(items));
    if (paragraphs.length > 0 && i > 1) {
      paragraphs[0] = { ...paragraphs[0], pageBreakBefore: true };
    }
    all.push(...paragraphs);
  }

  const charCount = all.reduce((sum, p) => sum + p.text.length, 0);
  return { paragraphs: all, pageCount: doc.numPages, charCount };
}
