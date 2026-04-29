import type { CalendarIcon, ThemeColor } from "../types";

export interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

const EXIF_DATE_PATTERN = /((?:19|20)\d{2}):([01]\d):([0-3]\d) [0-2]\d:[0-5]\d:[0-5]\d/;
const FILENAME_DATE_PATTERNS = [
  /((?:19|20)\d{2})[-_. ]([01]\d)[-_. ]([0-3]\d)/,
  /((?:19|20)\d{2})([01]\d)([0-3]\d)/,
];

export const calendarIcons: CalendarIcon[] = ["auto", "flower", "sun", "leaf", "water", "mountain", "moon", "dot"];

export async function inferCalendarDate(file: File): Promise<CalendarDateParts> {
  const exifDate = await readExifDate(file);
  if (exifDate) return exifDate;

  const fileNameDate = parseDateFromFileName(file.name);
  if (fileNameDate) return fileNameDate;

  const fallback = Number.isFinite(file.lastModified) && file.lastModified > 0 ? new Date(file.lastModified) : new Date();
  return dateToParts(fallback);
}

export function parseDateFromFileName(fileName: string): CalendarDateParts | null {
  for (const pattern of FILENAME_DATE_PATTERNS) {
    const match = fileName.match(pattern);
    if (!match) continue;
    const parts = parseDateParts(match[1], match[2], match[3]);
    if (parts) return parts;
  }

  return null;
}

export function recommendCalendarIcon(fileName: string, palette: ThemeColor[]): CalendarIcon {
  const lower = fileName.toLowerCase();
  if (/(flower|flora|bloom|daisy|rose|花|黄花|小黄花)/.test(lower)) return "flower";
  if (/(leaf|tree|forest|grass|plant|叶|树|草|森林)/.test(lower)) return "leaf";
  if (/(sea|lake|river|water|雨|海|湖|河|水)/.test(lower)) return "water";
  if (/(mountain|hill|山)/.test(lower)) return "mountain";
  if (/(night|moon|月|夜)/.test(lower)) return "moon";
  if (/(sun|light|日|太阳|阳光)/.test(lower)) return "sun";

  const color = palette[0]?.rgb;
  if (!color) return "dot";
  if (color.g > color.r * 1.08 && color.g > color.b * 1.08) return "leaf";
  if (color.b > color.r * 1.12 && color.b > color.g * 1.05) return "water";
  if (color.r > 160 && color.g > 120 && color.b < 100) return "sun";
  return "dot";
}

export function resolveCalendarIcon(icon: CalendarIcon, fileName: string, palette: ThemeColor[]): Exclude<CalendarIcon, "auto"> {
  if (icon !== "auto") return icon;
  const recommended = recommendCalendarIcon(fileName, palette);
  return recommended === "auto" ? "dot" : recommended;
}

function parseDateParts(yearValue: string, monthValue: string, dayValue: string): CalendarDateParts | null {
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return { year, month, day };
}

async function readExifDate(file: File): Promise<CalendarDateParts | null> {
  if (!/jpe?g$/i.test(file.name) && file.type !== "image/jpeg") return null;

  const chunk = await file.slice(0, Math.min(file.size, 512_000)).arrayBuffer();
  const text = new TextDecoder("latin1").decode(chunk);
  const match = text.match(EXIF_DATE_PATTERN);
  if (!match) return null;

  return parseDateParts(match[1], match[2], match[3]);
}

function dateToParts(date: Date): CalendarDateParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}
