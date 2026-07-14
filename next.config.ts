import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["mammoth", "sharp", "puppeteer-core", "@sparticuz/chromium"],
  // @sparticuz/chromium loads its browser binary from bin/*.br at runtime. Next's file
  // tracer doesn't pick these up automatically (they're read by path, not imported), so
  // force them into the webpage→PDF function or it 500s with "input directory does not exist".
  outputFileTracingIncludes: {
    "/api/url-to-pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default config;
