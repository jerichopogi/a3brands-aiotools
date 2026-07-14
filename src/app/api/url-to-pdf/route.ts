import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export const runtime = "nodejs";
export const maxDuration = 60;

const NAV_TIMEOUT_MS = 30_000;
const ALLOWED_FORMATS = new Set(["A4", "Letter"]);

interface RenderRequest {
  url?: unknown;
  format?: unknown;
  landscape?: unknown;
  printBackground?: unknown;
}

// Blocks obvious private / loopback / link-local / metadata targets to limit SSRF.
// Applied to both the literal hostname and its resolved IP.
function isBlockedIp(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 127 || a === 10) return true;
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  const v6 = ip.toLowerCase();
  return v6 === "::1" || v6.startsWith("fe80") || v6.startsWith("fc") || v6.startsWith("fd");
}

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.endsWith(".internal") || h.endsWith(".local")) return true;
  if (h === "metadata.google.internal") return true;
  return isBlockedIp(h);
}

async function validateUrl(raw: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Enter a valid URL, including http:// or https://");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error("That host is not allowed");
  }
  // Resolve to guard against a public name pointing at a private address.
  try {
    const { address } = await lookup(parsed.hostname);
    if (isBlockedIp(address)) {
      throw new Error("That host resolves to a blocked address");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("blocked")) throw err;
    throw new Error("Could not resolve that host");
  }
  return parsed;
}

async function launchBrowser() {
  // In local dev, use an installed Chrome; on Vercel, use the bundled chromium binary.
  if (process.env.NODE_ENV === "development") {
    return puppeteer.launch({ channel: "chrome", headless: true });
  }
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

export async function POST(req: Request) {
  let body: RenderRequest;
  try {
    body = (await req.json()) as RenderRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.url !== "string" || body.url.trim() === "") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const format = ALLOWED_FORMATS.has(String(body.format)) ? String(body.format) : "A4";
  const landscape = body.landscape === true;
  const printBackground = body.printBackground !== false; // default on

  let target: URL;
  try {
    target = await validateUrl(body.url.trim());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid URL" },
      { status: 400 },
    );
  }

  let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
    await page.goto(target.href, { waitUntil: "networkidle2" });

    const pdf = await page.pdf({
      format: format as "A4" | "Letter",
      landscape,
      printBackground,
      margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
    });

    const filename = `${target.hostname.replace(/^www\./, "")}.pdf`;
    return new NextResponse(Buffer.from(pdf) as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Rendering failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
