import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL =
  "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa" as const;

const MAX_DATA_URI_BYTES = 8 * 1024 * 1024;

interface UpscaleRequest {
  image: string;
  scale?: 2 | 3 | 4;
  faceEnhance?: boolean;
}

function isDataUri(s: unknown): s is string {
  return typeof s === "string" && s.startsWith("data:image/");
}

function extractUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const u = extractUrl(item);
      if (u) return u;
    }
    return null;
  }
  if (output && typeof output === "object") {
    const o = output as { url?: unknown };
    if (typeof o.url === "function") {
      try {
        const u = (o.url as () => unknown)();
        if (u instanceof URL) return u.toString();
        if (typeof u === "string") return u;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: "REPLICATE_API_TOKEN not configured on the server" },
      { status: 500 },
    );
  }

  let body: UpscaleRequest;
  try {
    body = (await req.json()) as UpscaleRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { image, scale = 4, faceEnhance = false } = body;

  if (!isDataUri(image)) {
    return NextResponse.json(
      { error: "image must be a data URI (data:image/...;base64,...)" },
      { status: 400 },
    );
  }
  if (image.length > MAX_DATA_URI_BYTES) {
    return NextResponse.json(
      { error: "Image too large. Keep uploads under ~6 MB." },
      { status: 413 },
    );
  }
  if (![2, 3, 4].includes(scale)) {
    return NextResponse.json(
      { error: "scale must be 2, 3, or 4" },
      { status: 400 },
    );
  }

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  try {
    const output = await replicate.run(MODEL, {
      input: { image, scale, face_enhance: faceEnhance },
    });

    const url = extractUrl(output);

    if (!url) {
      console.error("Replicate output (unexpected shape):", output);
      return NextResponse.json(
        { error: "Unexpected response shape from Replicate" },
        { status: 502 },
      );
    }

    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upscale failed";
    const lower = message.toLowerCase();

    if (lower.includes("402") || lower.includes("insufficient credit")) {
      return NextResponse.json(
        {
          error: "Replicate has no credit on file.",
          hint:
            "Go to your Replicate billing page, buy credit or enable auto-recharge, then wait 2–5 minutes for it to propagate.",
          actionUrl: "https://replicate.com/account/billing#billing",
          actionLabel: "Open Replicate billing",
        },
        { status: 402 },
      );
    }

    if (lower.includes("401") || lower.includes("unauthorized")) {
      return NextResponse.json(
        {
          error: "Replicate rejected the API token.",
          hint: "Check REPLICATE_API_TOKEN in .env.local and restart the dev server.",
        },
        { status: 401 },
      );
    }

    if (lower.includes("429") || lower.includes("rate limit")) {
      return NextResponse.json(
        {
          error: "Replicate rate limit hit.",
          hint: "Wait a minute before trying again.",
        },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
