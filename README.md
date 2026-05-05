# AIO Converter

Internal A3 Brands toolkit. All-in-one image and document utilities, deployed on Vercel.

## What it does

**Image (12)** — Image → WebP, optimizer, resizer, format converter (PNG/JPG/WebP/AVIF), cropper with social presets, background remover (on-device AI), AI upscaler (Real-ESRGAN), EXIF stripper, favicon generator, SVG optimizer, color palette extractor, watermark.

**Document (7)** — PDF merge, split, rotate, PDF → image, image → PDF, PDF text extract, DOCX → PDF.

**Utility (1)** — QR code generator (PNG / SVG, with full color + ECC controls).

**All tools run in the browser** — files never leave the device, no API keys, no per-file cost. The AI upscaler uses TensorFlow.js + ESRGAN-thick via WebGL (model caches after first load, ~16 MB). The only server route is:

- `/api/docx-to-pdf` — mammoth + pdf-lib. No external API.

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

The DOCX → PDF route uses a 60-second `maxDuration`. On the Hobby plan that's capped at 10s — bump to Pro if you need to convert large Word files.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind v4
- Client libs: `pdf-lib`, `pdfjs-dist`, `browser-image-compression`, `@imgly/background-removal`, `@tensorflow/tfjs` + `upscaler` (ESRGAN), `qrcode`, `svgo`, `jszip`
- Server: `mammoth` (DOCX parsing only)

## Adding a new tool

1. Add an entry to `src/lib/tools.ts`
2. Create the component in `src/components/tools/<Name>.tsx`
3. Register it in `src/components/tools/registry.ts`

The dynamic route `/tools/[slug]` and dashboard pick it up automatically.
