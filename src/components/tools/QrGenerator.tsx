"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { downloadBlob } from "@/lib/format";

type ECC = "L" | "M" | "Q" | "H";
type Format = "png" | "svg";

export default function QrGenerator() {
  const [text, setText] = useState("https://a3brands.com");
  const [size, setSize] = useState(512);
  const [margin, setMargin] = useState(2);
  const [ecc, setEcc] = useState<ECC>("M");
  const [dark, setDark] = useState("#0a0a0a");
  const [light, setLight] = useState("#ffffff");
  const [format, setFormat] = useState<Format>("png");
  const [dataUrl, setDataUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!text.trim()) { setDataUrl(""); return; }
    let cancelled = false;
    (async () => {
      if (format === "png") {
        const url = await QRCode.toDataURL(text, {
          errorCorrectionLevel: ecc,
          margin,
          width: size,
          color: { dark, light },
        });
        if (!cancelled) setDataUrl(url);
      } else {
        const svg = await QRCode.toString(text, {
          type: "svg",
          errorCorrectionLevel: ecc,
          margin,
          color: { dark, light },
          width: size,
        });
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        if (!cancelled) setDataUrl(url);
      }
    })();
    return () => { cancelled = true; };
  }, [text, size, margin, ecc, dark, light, format]);

  const download = async () => {
    if (!text.trim()) return;
    if (format === "png") {
      const blob = await fetch(dataUrl).then((r) => r.blob());
      downloadBlob(blob, "qr.png");
    } else {
      const blob = await fetch(dataUrl).then((r) => r.blob());
      downloadBlob(blob, "qr.svg");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="surface flex aspect-square items-center justify-center overflow-hidden p-8" style={{ background: light }}>
        {dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="QR preview" className="max-h-full max-w-full" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <aside className="surface h-fit p-5 space-y-5">
        <label className="block">
          <div className="label mb-1">Content</div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="input font-mono text-sm" rows={3} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <div className="label mb-1">Size</div>
            <input type="number" value={size} onChange={(e) => setSize(Number(e.target.value))} className="input" />
          </label>
          <label>
            <div className="label mb-1">Margin</div>
            <input type="number" value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="input" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <div className="label mb-1">Foreground</div>
            <input type="color" value={dark} onChange={(e) => setDark(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-transparent" />
          </label>
          <label>
            <div className="label mb-1">Background</div>
            <input type="color" value={light} onChange={(e) => setLight(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-transparent" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label mb-1">Error correction</div>
            <select value={ecc} onChange={(e) => setEcc(e.target.value as ECC)} className="input">
              <option value="L">L · 7%</option>
              <option value="M">M · 15%</option>
              <option value="Q">Q · 25%</option>
              <option value="H">H · 30%</option>
            </select>
          </div>
          <div>
            <div className="label mb-1">Format</div>
            <select value={format} onChange={(e) => setFormat(e.target.value as Format)} className="input">
              <option value="png">PNG</option>
              <option value="svg">SVG</option>
            </select>
          </div>
        </div>
        <button onClick={download} className="btn btn-primary w-full" disabled={!dataUrl}>Download {format.toUpperCase()}</button>
      </aside>
    </div>
  );
}
