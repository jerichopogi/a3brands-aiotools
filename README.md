# AIO Converter

Internal A3 Brands toolkit. All-in-one image and document utilities, deployed on Vercel.

## What it does

**Image (12)** — Image → WebP, optimizer, resizer, format converter (PNG/JPG/WebP/AVIF), cropper with social presets, background remover (on-device AI), AI upscaler (Real-ESRGAN), EXIF stripper, favicon generator, SVG optimizer, color palette extractor, watermark.

**Document (10)** — PDF merge, split, rotate, PDF → image, image → PDF, PDF text extract, DOCX → PDF, PDF → DOCX (on-device layout reconstruction, with optional OCR mode for scanned/image PDFs via Tesseract.js), PDF compressor (rasterize + auto-tune to a target size, in-browser), Webpage → PDF (headless-Chrome render on the server).

**Utility (1)** — QR code generator (PNG / SVG, with full color + ECC controls).

**Most tools run in the browser** — files never leave the device, no API keys, no per-file cost. The AI upscaler uses TensorFlow.js + ESRGAN-thick via WebGL (model caches after first load, ~16 MB). PDF → DOCX in OCR mode uses Tesseract.js on-device (English model, ~13 MB, downloaded from CDN and cached after first use); files still never leave the browser. The PDF compressor rasterizes pages and re-encodes them entirely in the browser, lowering JPEG quality/scale until the output fits under the chosen size (default 8 MB). The two server routes are:

- `/api/docx-to-pdf` — mammoth + pdf-lib. No external API.
- `/api/url-to-pdf` — puppeteer-core + @sparticuz/chromium (headless Chrome). No API key. Fetches the requested URL server-side, with SSRF guards blocking private/loopback/link-local/metadata hosts.

## Local development

```bash
npm install
npm run dev
```

No environment variables required.

App runs at http://localhost:3000.

## Deploy to Vercel

1. Push this repo to GitHub
2. Import into Vercel
3. Build command: `next build` (default). Framework preset: Next.js. No env vars, no other config required.

The DOCX → PDF and Webpage → PDF routes use a 60-second `maxDuration`. On the Hobby plan that's capped at 10s — bump to Pro for large Word files or slow-loading webpages. Webpage → PDF ships the `@sparticuz/chromium` binary (~50 MB) in the serverless function; locally it launches your installed Chrome via `channel: "chrome"`, so a desktop Chrome must be present for `npm run dev`.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind v4
- Client libs: `pdf-lib`, `pdfjs-dist`, `browser-image-compression`, `@imgly/background-removal`, `@tensorflow/tfjs` + `upscaler` (ESRGAN), `qrcode`, `svgo`, `jszip`
- Server: `mammoth` (DOCX parsing), `puppeteer-core` + `@sparticuz/chromium` (webpage rendering)

## Adding a new tool

1. Add an entry to `src/lib/tools.ts`
2. Create the component in `src/components/tools/<Name>.tsx`
3. Register it in `src/components/tools/registry.ts`

The dynamic route `/tools/[slug]` and dashboard pick it up automatically.
