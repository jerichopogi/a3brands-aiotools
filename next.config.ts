import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["mammoth", "sharp", "puppeteer-core", "@sparticuz/chromium"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default config;
