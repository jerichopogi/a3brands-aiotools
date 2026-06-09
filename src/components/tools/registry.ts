import type { ComponentType } from "react";
import ImageToWebp from "./ImageToWebp";
import ImageOptimizer from "./ImageOptimizer";
import ImageResizer from "./ImageResizer";
import FormatConverter from "./FormatConverter";
import ImageCropper from "./ImageCropper";
import BackgroundRemover from "./BackgroundRemover";
import ImageUpscaler from "./ImageUpscaler";
import ExifStripper from "./ExifStripper";
import FaviconGenerator from "./FaviconGenerator";
import SvgOptimizer from "./SvgOptimizer";
import ColorPalette from "./ColorPalette";
import Watermark from "./Watermark";
import PdfMerge from "./PdfMerge";
import PdfSplit from "./PdfSplit";
import PdfRotate from "./PdfRotate";
import PdfToImage from "./PdfToImage";
import ImageToPdf from "./ImageToPdf";
import PdfText from "./PdfText";
import DocxToPdf from "./DocxToPdf";
import PdfToDocx from "./PdfToDocx";
import QrGenerator from "./QrGenerator";

export const TOOL_COMPONENTS: Record<string, ComponentType> = {
  "image-to-webp": ImageToWebp,
  "image-optimizer": ImageOptimizer,
  "image-resizer": ImageResizer,
  "format-converter": FormatConverter,
  "image-cropper": ImageCropper,
  "background-remover": BackgroundRemover,
  "image-upscaler": ImageUpscaler,
  "exif-stripper": ExifStripper,
  "favicon-generator": FaviconGenerator,
  "svg-optimizer": SvgOptimizer,
  "color-palette": ColorPalette,
  watermark: Watermark,
  "pdf-merge": PdfMerge,
  "pdf-split": PdfSplit,
  "pdf-rotate": PdfRotate,
  "pdf-to-image": PdfToImage,
  "image-to-pdf": ImageToPdf,
  "pdf-text": PdfText,
  "docx-to-pdf": DocxToPdf,
  "pdf-to-docx": PdfToDocx,
  "qr-generator": QrGenerator,
};
