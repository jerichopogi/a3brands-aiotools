import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

type Mode = "lossless" | "smart";
type OutputFormat = "auto" | "png" | "jpeg" | "webp";

interface OptimizeResult {
  buffer: Buffer;
  mime: string;
  ext: string;
}

async function optimizeLossless(
  input: Buffer,
  format: OutputFormat,
  inputFormat: string | undefined,
  maxDim: number | undefined,
): Promise<OptimizeResult> {
  let pipeline = sharp(input, { failOn: "none" });

  if (maxDim && maxDim > 0) {
    pipeline = pipeline.resize({
      width: maxDim,
      height: maxDim,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const target =
    format === "auto"
      ? inputFormat === "jpeg" || inputFormat === "jpg"
        ? "jpeg"
        : inputFormat === "webp"
          ? "webp"
          : "png"
      : format;

  if (target === "png") {
    const buf = await pipeline
      .png({ compressionLevel: 9, palette: true, effort: 10 })
      .toBuffer();
    return { buffer: buf, mime: "image/png", ext: "png" };
  }
  if (target === "webp") {
    const buf = await pipeline.webp({ lossless: true, effort: 6 }).toBuffer();
    return { buffer: buf, mime: "image/webp", ext: "webp" };
  }
  // JPEG cannot be truly lossless. Use mozjpeg at quality 100, which preserves
  // the original DCT quality envelope while optimizing the encoding.
  const buf = await pipeline
    .jpeg({ mozjpeg: true, quality: 100, chromaSubsampling: "4:4:4" })
    .toBuffer();
  return { buffer: buf, mime: "image/jpeg", ext: "jpg" };
}

async function optimizeSmart(
  input: Buffer,
  format: OutputFormat,
  inputFormat: string | undefined,
  quality: number,
  maxDim: number | undefined,
): Promise<OptimizeResult> {
  let pipeline = sharp(input, { failOn: "none" });

  if (maxDim && maxDim > 0) {
    pipeline = pipeline.resize({
      width: maxDim,
      height: maxDim,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const target =
    format === "auto"
      ? inputFormat === "jpeg" || inputFormat === "jpg"
        ? "jpeg"
        : inputFormat === "webp"
          ? "webp"
          : "png"
      : format;

  if (target === "png") {
    const buf = await pipeline
      .png({ compressionLevel: 9, palette: true, effort: 10 })
      .toBuffer();
    return { buffer: buf, mime: "image/png", ext: "png" };
  }
  if (target === "webp") {
    const buf = await pipeline.webp({ quality, effort: 6 }).toBuffer();
    return { buffer: buf, mime: "image/webp", ext: "webp" };
  }
  const buf = await pipeline.jpeg({ mozjpeg: true, quality }).toBuffer();
  return { buffer: buf, mime: "image/jpeg", ext: "jpg" };
}

export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File must be 1 byte – ${MAX_BYTES / 1024 / 1024} MB` },
      { status: 413 },
    );
  }

  const mode = (form.get("mode") as Mode) || "lossless";
  const format = (form.get("format") as OutputFormat) || "auto";
  const qualityStr = form.get("quality");
  const quality = qualityStr ? Math.min(100, Math.max(40, Number(qualityStr))) : 82;
  const maxDimStr = form.get("maxDim");
  const maxDim = maxDimStr ? Math.max(0, Number(maxDimStr)) : 0;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const meta = await sharp(buffer, { failOn: "none" }).metadata();
    const inputFormat = meta.format;

    const result =
      mode === "smart"
        ? await optimizeSmart(buffer, format, inputFormat, quality, maxDim)
        : await optimizeLossless(buffer, format, inputFormat, maxDim);

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "content-type": result.mime,
        "x-output-ext": result.ext,
        "x-original-size": String(file.size),
        "x-output-size": String(result.buffer.length),
        "x-input-format": inputFormat ?? "unknown",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Optimize failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
