import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Block {
  kind: "heading" | "paragraph" | "list";
  level?: number;
  text: string;
  bold?: boolean;
  italic?: boolean;
}

function htmlToBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  const stripTags = (s: string) =>
    s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .trim();

  const re = /<(h[1-6]|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase();
    const inner = m[2];
    const text = stripTags(inner);
    if (!text) continue;
    if (tag.startsWith("h")) {
      blocks.push({ kind: "heading", level: parseInt(tag[1], 10), text });
    } else if (tag === "li") {
      blocks.push({ kind: "list", text });
    } else {
      blocks.push({ kind: "paragraph", text });
    }
  }
  return blocks;
}

function wrap(text: string, font: import("pdf-lib").PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get("file");
    if (!(file instanceof File)) {
      return new NextResponse("file is required", { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const { value: html } = await mammoth.convertToHtml({ buffer: buf });
    const blocks = htmlToBlocks(html);

    const pdf = await PDFDocument.create();
    const helv = await pdf.embedFont(StandardFonts.Helvetica);
    const helvB = await pdf.embedFont(StandardFonts.HelveticaBold);

    const pageW = 595.28;
    const pageH = 841.89;
    const margin = 56;
    const maxWidth = pageW - margin * 2;
    let page = pdf.addPage([pageW, pageH]);
    let y = pageH - margin;

    const ensure = (lineHeight: number) => {
      if (y - lineHeight < margin) {
        page = pdf.addPage([pageW, pageH]);
        y = pageH - margin;
      }
    };

    for (const block of blocks) {
      let size = 11;
      let font = helv;
      let prefix = "";
      let gapBefore = 6;
      let gapAfter = 4;
      if (block.kind === "heading") {
        const level = block.level ?? 2;
        size = level === 1 ? 24 : level === 2 ? 18 : level === 3 ? 15 : 13;
        font = helvB;
        gapBefore = 14;
        gapAfter = 6;
      } else if (block.kind === "list") {
        prefix = "•  ";
      }
      y -= gapBefore;
      const lines = wrap(prefix + block.text, font, size, maxWidth);
      const lh = size * 1.35;
      for (const line of lines) {
        ensure(lh);
        page.drawText(line, { x: margin, y: y - size, size, font, color: rgb(0.08, 0.08, 0.1) });
        y -= lh;
      }
      y -= gapAfter;
    }

    const data = await pdf.save();
    return new NextResponse(Buffer.from(data) as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${(file.name || "document").replace(/\.docx$/i, "")}.pdf"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Conversion failed";
    return new NextResponse(msg, { status: 500 });
  }
}
