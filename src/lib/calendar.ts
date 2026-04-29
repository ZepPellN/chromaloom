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

export const calendarIcons: CalendarIcon[] = ["auto", "flower", "star"];

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
  if (/(star|星|星星)/.test(lower)) return "star";

  const color = palette[0]?.rgb;
  if (!color) return stableDecorativeIcon(fileName);
  if (color.g > color.r * 1.05 && color.g > color.b * 1.05) return "flower";
  return stableDecorativeIcon(`${fileName}-${color.r}-${color.g}-${color.b}`);
}

export function resolveCalendarIcon(icon: CalendarIcon, fileName: string, palette: ThemeColor[]): Exclude<CalendarIcon, "auto"> {
  if (icon !== "auto") return icon;
  const recommended = recommendCalendarIcon(fileName, palette);
  return recommended === "auto" ? stableDecorativeIcon(fileName) : recommended;
}

function stableDecorativeIcon(seed: string): Exclude<CalendarIcon, "auto"> {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % 2 === 0 ? "flower" : "star";
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
