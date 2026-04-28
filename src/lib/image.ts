import { extractThemeColors } from "./color";
import type { LoadedImage, ThemeColor } from "../types";

export async function loadImageElement(src: string): Promise<LoadedImage> {
  const element = new Image();
  element.decoding = "async";
  element.src = src;
  await element.decode();
  return {
    element,
    width: element.naturalWidth,
    height: element.naturalHeight,
  };
}

export async function fileToImage(file: File): Promise<LoadedImage & { url: string }> {
  const url = URL.createObjectURL(file);
  const loaded = await loadImageElement(url);
  return { ...loaded, url };
}

export function extractThemeColorsFromImage(image: HTMLImageElement, maxSide = 220): ThemeColor[] {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);
  return extractThemeColors(context.getImageData(0, 0, width, height));
}
