import type { Rgb, ThemeColor } from "../types";

const INK: Rgb = { r: 18, g: 20, b: 18 };
const PAPER: Rgb = { r: 246, g: 242, b: 232 };

interface Bucket {
  r: number;
  g: number;
  b: number;
  count: number;
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  const convert = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const light = Math.max(relativeLuminance(a), relativeLuminance(b));
  const dark = Math.min(relativeLuminance(a), relativeLuminance(b));
  return (light + 0.05) / (dark + 0.05);
}

export function readableTextColor(background: string, mode: "auto" | "ink" | "paper" = "auto"): string {
  if (mode === "ink") return rgbToHex(INK);
  if (mode === "paper") return rgbToHex(PAPER);

  const rgb = hexToRgb(background);
  return contrastRatio(rgb, INK) >= contrastRatio(rgb, PAPER) ? rgbToHex(INK) : rgbToHex(PAPER);
}

export function extractThemeColors(imageData: ImageData, limit = 8): ThemeColor[] {
  const buckets = new Map<string, Bucket>();
  const data = imageData.data;
  const stride = Math.max(1, Math.floor((imageData.width * imageData.height) / 18_000));

  for (let pixel = 0; pixel < data.length; pixel += 4 * stride) {
    const alpha = data[pixel + 3];
    if (alpha < 180) continue;

    const r = data[pixel];
    const g = data[pixel + 1];
    const b = data[pixel + 2];
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const existing = buckets.get(key);

    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  const total = [...buckets.values()].reduce((sum, bucket) => sum + bucket.count, 0) || 1;

  const candidates = [...buckets.values()]
    .map((bucket) => {
      const rgb = {
        r: Math.round(bucket.r / bucket.count),
        g: Math.round(bucket.g / bucket.count),
        b: Math.round(bucket.b / bucket.count),
      };
      return scoreThemeColor(rgb, bucket.count / total);
    })
    .filter(Boolean) as ThemeColor[];

  const deduped: ThemeColor[] = [];
  for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
    const tooClose = deduped.some((chosen) => colorDistance(chosen.rgb, candidate.rgb) < 38);
    if (!tooClose) deduped.push(candidate);
    if (deduped.length >= limit) break;
  }

  return deduped.length > 0 ? deduped : [fallbackThemeColor()];
}

function scoreThemeColor(rgb: Rgb, population: number): ThemeColor | null {
  const hsl = rgbToHsl(rgb);
  const luminance = relativeLuminance(rgb);
  const contrastInk = contrastRatio(rgb, INK);
  const contrastPaper = contrastRatio(rgb, PAPER);
  const bestContrast = Math.max(contrastInk, contrastPaper);

  if (luminance < 0.04 || luminance > 0.92) return null;
  if (hsl.s < 0.05 && (luminance < 0.18 || luminance > 0.82)) return null;

  const comfortLightness = 1 - Math.min(1, Math.abs(luminance - 0.42) / 0.42);
  const comfortSaturation = 1 - Math.min(1, Math.abs(hsl.s - 0.32) / 0.55);
  const readability = Math.min(1, bestContrast / 7);
  const presence = Math.min(1, Math.sqrt(population) * 4);
  const warmth = hsl.s > 0.08 ? 0.08 : 0;
  const score = presence * 0.35 + comfortLightness * 0.24 + comfortSaturation * 0.18 + readability * 0.15 + warmth;

  return {
    hex: rgbToHex(rgb),
    rgb,
    population,
    score,
    contrastInk,
    contrastPaper,
    label: labelForColor(hsl.h, hsl.s, luminance),
  };
}

function fallbackThemeColor(): ThemeColor {
  const rgb = { r: 136, g: 153, b: 118 };
  return {
    hex: rgbToHex(rgb),
    rgb,
    population: 1,
    score: 1,
    contrastInk: contrastRatio(rgb, INK),
    contrastPaper: contrastRatio(rgb, PAPER),
    label: "quiet green",
  };
}

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  let h = 0;

  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
}

function labelForColor(hue: number, saturation: number, luminance: number): string {
  if (saturation < 0.08) return luminance < 0.35 ? "charcoal wash" : "stone neutral";
  if (hue < 28 || hue >= 345) return "temple red";
  if (hue < 70) return "ochre earth";
  if (hue < 155) return "quiet green";
  if (hue < 210) return "mineral blue";
  if (hue < 275) return "ink violet";
  return "muted rose";
}
