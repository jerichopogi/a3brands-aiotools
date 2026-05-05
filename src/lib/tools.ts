export type ToolCategory = "image" | "document" | "utility";

export interface ToolDef {
  slug: string;
  title: string;
  tagline: string;
  category: ToolCategory;
  badge?: "new" | "ml" | "beta" | "server";
  accent?: string;
}

export const TOOLS: ToolDef[] = [
  {
    slug: "image-to-webp",
    title: "Image → WebP",
    tagline: "Convert any image to modern WebP. Quality dial, batch-friendly.",
    category: "image",
  },
  {
    slug: "image-optimizer",
    title: "Image Optimizer",
    tagline: "Squeeze JPG / PNG / WebP without visible quality loss.",
    category: "image",
  },
  {
    slug: "image-resizer",
    title: "Image Resizer",
    tagline: "Pixel-precise resize with smart presets and aspect lock.",
    category: "image",
  },
  {
    slug: "format-converter",
    title: "Format Converter",
    tagline: "Swap between PNG, JPG, WebP, and AVIF in any direction.",
    category: "image",
  },
  {
    slug: "image-cropper",
    title: "Image Cropper",
    tagline: "Crop with social presets — square, story, OG, banner.",
    category: "image",
  },
  {
    slug: "background-remover",
    title: "Background Remover",
    tagline: "On-device AI alpha matting — files never leave your browser.",
    category: "image",
    badge: "ml",
  },
  {
    slug: "image-upscaler",
    title: "AI Upscaler",
    tagline: "ESRGAN super-resolution in your browser. Sharpens blurry photos.",
    category: "image",
    badge: "ml",
  },
  {
    slug: "exif-stripper",
    title: "EXIF Stripper",
    tagline: "Remove metadata from photos. Preview camera/GPS data first.",
    category: "image",
  },
  {
    slug: "favicon-generator",
    title: "Favicon Generator",
    tagline: "One upload → full ICO + Apple touch icon set + manifest.",
    category: "image",
  },
  {
    slug: "svg-optimizer",
    title: "SVG Optimizer",
    tagline: "SVGO in your browser. Strips bloat, keeps fidelity.",
    category: "image",
  },
  {
    slug: "color-palette",
    title: "Palette Extractor",
    tagline: "Pull a dominant-color palette from any image.",
    category: "image",
  },
  {
    slug: "watermark",
    title: "Watermark",
    tagline: "Stamp logo or text across batches. Adjustable placement.",
    category: "image",
  },
  {
    slug: "pdf-merge",
    title: "PDF Merge",
    tagline: "Combine PDFs into one. Drag to reorder.",
    category: "document",
  },
  {
    slug: "pdf-split",
    title: "PDF Split",
    tagline: "Extract page ranges into new PDFs.",
    category: "document",
  },
  {
    slug: "pdf-rotate",
    title: "PDF Rotate",
    tagline: "Rotate selected pages or the whole document.",
    category: "document",
  },
  {
    slug: "pdf-to-image",
    title: "PDF → Image",
    tagline: "Render every page as PNG or JPG. Pick the DPI.",
    category: "document",
  },
  {
    slug: "image-to-pdf",
    title: "Image → PDF",
    tagline: "Bundle photos into a single PDF, ordered however you like.",
    category: "document",
  },
  {
    slug: "pdf-text",
    title: "PDF Text Extract",
    tagline: "Pull selectable text from PDFs into plain UTF-8.",
    category: "document",
  },
  {
    slug: "docx-to-pdf",
    title: "DOCX → PDF",
    tagline: "Word documents converted via styled HTML pipeline.",
    category: "document",
    badge: "server",
  },
  {
    slug: "qr-generator",
    title: "QR Generator",
    tagline: "URL or text → SVG/PNG QR. Optional logo center.",
    category: "utility",
  },
];

export function getTool(slug: string): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export const CATEGORY_LABEL: Record<ToolCategory, string> = {
  image: "Image",
  document: "Document",
  utility: "Utility",
};
