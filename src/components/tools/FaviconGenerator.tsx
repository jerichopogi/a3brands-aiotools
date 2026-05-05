"use client";

import { useState } from "react";
import JSZip from "jszip";
import Dropzone from "@/components/Dropzone";
import ResultList, { type ResultItem } from "@/components/ResultList";
import { canvasToBlob, drawTo, fileToImage } from "@/lib/image/canvas";

const SIZES = [16, 32, 48, 64, 96, 128, 180, 192, 256, 384, 512];

export default function FaviconGenerator() {
  const [items, setItems] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setBusy(true);
    try {
      const img = await fileToImage(file);
      const zip = new JSZip();
      let sample: Blob | null = null;
      for (const size of SIZES) {
        const canvas = drawTo(img, size, size);
        const blob = await canvasToBlob(canvas, "image/png");
        zip.file(`favicon-${size}x${size}.png`, blob);
        if (size === 32) sample = blob;
      }
      // Apple touch icon (180px) is included above as a PNG; add a manifest stub
      zip.file(
        "site.webmanifest",
        JSON.stringify(
          {
            name: "App",
            short_name: "App",
            icons: [
              { src: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
              { src: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
            ],
            theme_color: "#000000",
            background_color: "#ffffff",
            display: "standalone",
          },
          null,
          2,
        ),
      );
      zip.file(
        "head-snippet.html",
        [
          '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
          '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
          '<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180x180.png">',
          '<link rel="manifest" href="/site.webmanifest">',
        ].join("\n"),
      );
      const archive = await zip.generateAsync({ type: "blob" });
      setItems([
        {
          name: "favicons.zip",
          blob: archive,
          preview: sample ? URL.createObjectURL(sample) : undefined,
          meta: `${SIZES.length} sizes`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Dropzone
          onFiles={onFiles}
          accept={{ "image/*": [] }}
          multiple={false}
          hint="Use a square image with safe padding — 1024×1024 is ideal"
        />
        {busy && <div className="surface mt-4 p-4 text-sm">Generating sizes…</div>}
        <ResultList items={items} onClear={() => setItems([])} />
      </div>
      <aside className="surface h-fit p-5 text-sm text-[var(--color-text-muted)]">
        <div className="display mb-2 text-2xl text-[var(--color-text)]">What you get</div>
        <p className="text-xs text-[var(--color-text-dim)]">
          PNGs at {SIZES.join(", ")} px, an Apple touch icon, a webmanifest, and a copy-paste
          &lt;head&gt; snippet. Drop the files at your site root.
        </p>
      </aside>
    </div>
  );
}
