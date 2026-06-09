"use client";

import JSZip from "jszip";

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export interface DocxParagraph {
  text: string;
  /** 1–3 renders as a bold, larger heading run. Omitted = body text. */
  heading?: 1 | 2 | 3;
  /** Forces the paragraph onto a fresh page (used at PDF page boundaries). */
  pageBreakBefore?: boolean;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

// A4 page in twips (1/20 pt) with ~2 cm margins.
const SECT_PR =
  `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`;

// Half-points: 36 = 18pt, 28 = 14pt, 24 = 12pt.
const HEADING_HALF_PT: Record<1 | 2 | 3, number> = { 1: 36, 2: 28, 3: 24 };

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function paragraphXml(p: DocxParagraph): string {
  const pPrParts: string[] = [];
  if (p.pageBreakBefore) pPrParts.push("<w:pageBreakBefore/>");
  if (p.heading) pPrParts.push(`<w:outlineLvl w:val="${p.heading - 1}"/>`);
  const pPr = pPrParts.length ? `<w:pPr>${pPrParts.join("")}</w:pPr>` : "";

  const rPrParts: string[] = [];
  if (p.heading) {
    rPrParts.push("<w:b/>");
    rPrParts.push(`<w:sz w:val="${HEADING_HALF_PT[p.heading]}"/>`);
  }
  const rPr = rPrParts.length ? `<w:rPr>${rPrParts.join("")}</w:rPr>` : "";

  const run = p.text
    ? `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(p.text)}</w:t></w:r>`
    : "";
  return `<w:p>${pPr}${run}</w:p>`;
}

/** Builds a minimal but spec-valid .docx (Open Packaging Conventions) blob. */
export async function buildDocx(paragraphs: DocxParagraph[]): Promise<Blob> {
  const body = paragraphs.map(paragraphXml).join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}${SECT_PR}</w:body></w:document>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", RELS);
  zip.file("word/document.xml", documentXml);

  return zip.generateAsync({ type: "blob", mimeType: DOCX_MIME });
}
