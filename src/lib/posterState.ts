import type { FieldMode, FitMode, LayoutMode, PosterItem, PosterSettings, TextColorMode, ThemeColor } from "../types";

export const MAX_BATCH = 9;

export const DEFAULT_FONT = `"Songti SC", "STSong", "Noto Serif CJK SC", "Noto Serif SC", serif`;

export function createPosterItem(input: {
  id: string;
  fileName: string;
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  palette: ThemeColor[];
  title?: string;
}): PosterItem {
  const themeColor = input.palette[0]?.hex ?? "#889976";
  return {
    id: input.id,
    fileName: input.fileName,
    imageUrl: input.imageUrl,
    naturalWidth: input.naturalWidth,
    naturalHeight: input.naturalHeight,
    createdAt: Date.now(),
    palette: input.palette,
    themeColor,
    title: input.title ?? "",
    layoutMode: "auto",
    fieldMode: "balanced",
    fitMode: "contain",
    textColorMode: "auto",
    fontFamily: DEFAULT_FONT,
    fontSize: 62,
    fontWeight: 700,
    imageTransform: { x: 0, y: 0, scale: 1 },
  };
}

export function applyStyleFrom(source: PosterItem, target: PosterItem): PosterItem {
  return {
    ...target,
    title: source.title,
    layoutMode: source.layoutMode,
    fieldMode: source.fieldMode,
    fitMode: source.fitMode,
    textColorMode: source.textColorMode,
    fontFamily: source.fontFamily,
    fontSize: source.fontSize,
    fontWeight: source.fontWeight,
    imageTransform: source.imageTransform,
  };
}

export function sanitizeFileName(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "");
  return stem
    .trim()
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "poster";
}

export const layoutModes: LayoutMode[] = ["auto", "4:5", "1:1", "9:16", "16:9", "3:4"];
export const fieldModes: FieldMode[] = ["compact", "balanced", "poster"];
export const fitModes: FitMode[] = ["contain", "cover"];
export const textColorModes: TextColorMode[] = ["auto", "ink", "paper"];

export function updatePosterSetting<K extends keyof PosterSettings>(item: PosterItem, key: K, value: PosterSettings[K]): PosterItem {
  return { ...item, [key]: value };
}
