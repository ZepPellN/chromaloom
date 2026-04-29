import { readableTextColor } from "./color";
import { resolveCalendarIcon } from "./calendar";
import { fitRect, getPosterLayout } from "./layout";
import type { LoadedImage, PosterItem, PosterLayout } from "../types";

export interface RenderOptions {
  previewScale?: number;
}

const IMAGE_MAT_COLOR = "#f7f6f2";

export function renderPoster(
  canvas: HTMLCanvasElement,
  item: PosterItem,
  image: LoadedImage,
  options: RenderOptions = {},
): PosterLayout {
  const layout = getPosterLayout(item);
  const scale = options.previewScale ?? 1;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  canvas.width = Math.round(layout.width * scale);
  canvas.height = Math.round(layout.height * scale);
  canvas.style.aspectRatio = `${layout.width} / ${layout.height}`;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, layout.width, layout.height);

  context.fillStyle = IMAGE_MAT_COLOR;
  context.fillRect(0, 0, layout.width, layout.height);

  context.fillStyle = item.themeColor;
  context.fillRect(layout.colorField.x, layout.colorField.y, layout.colorField.width, layout.colorField.height);

  const imageRect = fitRect(
    image.width,
    image.height,
    layout.imageArea,
    item.fitMode,
    item.imageTransform.scale,
    item.imageTransform.x,
    item.imageTransform.y,
  );

  context.save();
  context.beginPath();
  context.rect(layout.imageArea.x, layout.imageArea.y, layout.imageArea.width, layout.imageArea.height);
  context.clip();
  context.drawImage(image.element, imageRect.x, imageRect.y, imageRect.width, imageRect.height);
  context.restore();

  if (item.compositionMode === "calendar") {
    drawCalendar(context, item, layout);
  } else {
    drawTitle(context, item, layout);
  }
  return layout;
}

function drawCalendar(context: CanvasRenderingContext2D, item: PosterItem, layout: PosterLayout) {
  const field = layout.colorField;
  const textColor = readableTextColor(item.themeColor, item.textColorMode);
  const iconColor = pickIconColor(item);
  const monthIndex = clampInteger(item.calendarMonth, 1, 12) - 1;
  const safeDay = clampDay(item.calendarYear, monthIndex, item.calendarDay);
  const daysInMonth = new Date(item.calendarYear, monthIndex + 1, 0).getDate();
  const firstWeekday = new Date(item.calendarYear, monthIndex, 1).getDay();
  const monthName = new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(item.calendarYear, monthIndex, 1));

  const narrow = field.width < field.height;
  const padding = Math.max(28, Math.min(field.width, field.height) * 0.09);
  const content = {
    x: field.x + padding,
    y: field.y + padding,
    width: Math.max(1, field.width - padding * 2),
    height: Math.max(1, field.height - padding * 2),
  };
  const cellWidth = content.width / 7;
  const rowGap = narrow ? content.height * 0.07 : content.height * 0.06;
  const monthSize = Math.max(22, Math.min(72, content.width / (narrow ? 5.2 : 9), content.height * 0.13));
  const weekdaySize = Math.max(11, Math.min(34, cellWidth * 0.34, content.height * 0.06));
  const daySize = Math.max(12, Math.min(40, cellWidth * 0.38, content.height * 0.072));
  const titleY = content.y + monthSize;
  const weekdayY = titleY + rowGap;
  const dayStartY = weekdayY + rowGap * 0.95;
  const dayRowGap = Math.max(daySize * 1.65, (content.height - (dayStartY - content.y) - content.height * 0.18) / 6);

  context.save();
  context.fillStyle = textColor;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = "rgba(0, 0, 0, 0.08)";
  context.shadowBlur = Math.max(0, monthSize * 0.04);
  context.shadowOffsetY = Math.max(1, monthSize * 0.02);

  context.font = `${item.fontWeight} ${monthSize}px ${item.fontFamily}`;
  context.fillText(monthName, field.x + field.width / 2, titleY);

  context.font = `${Math.max(500, item.fontWeight - 100)} ${weekdaySize}px ${item.fontFamily}`;
  const weekdays = ["Sun", "Mon", "Tues", "Wed", "Thur", "Fri", "Sat"];
  for (let weekday = 0; weekday < 7; weekday += 1) {
    context.fillText(weekdays[weekday], content.x + cellWidth * (weekday + 0.5), weekdayY);
  }

  context.font = `${Math.max(500, item.fontWeight - 100)} ${daySize}px ${item.fontFamily}`;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const index = firstWeekday + day - 1;
    const column = index % 7;
    const row = Math.floor(index / 7);
    const x = content.x + cellWidth * (column + 0.5);
    const y = dayStartY + dayRowGap * row;
    context.fillText(String(day).padStart(2, "0"), x, y);

    if (day === safeDay) {
      const iconSize = Math.max(daySize, Math.min(daySize * 1.22, cellWidth * 0.56, dayRowGap * 0.82));
      drawCalendarIcon(context, resolveCalendarIcon(item.calendarIcon, item.fileName, item.palette), x + daySize * 0.82, y - daySize * 0.18, iconSize, iconColor);
    }
  }

  const title = item.title.trim();
  if (title) {
    context.font = `${item.fontWeight} ${Math.max(18, Math.min(item.fontSize, content.height * 0.1))}px ${item.fontFamily}`;
    const lines = wrapTitle(context, title, content.width * 0.76, item).slice(0, 2);
    const lineHeight = Math.max(22, Math.min(item.fontSize * 1.2, content.height * 0.12));
    const startY = field.y + field.height - padding - lineHeight * (lines.length - 1) - lineHeight * 0.2;
    for (let index = 0; index < lines.length; index += 1) {
      context.fillText(lines[index], field.x + field.width / 2, startY + lineHeight * index);
    }
  }

  context.restore();
}

function drawTitle(context: CanvasRenderingContext2D, item: PosterItem, layout: PosterLayout) {
  const title = item.title.trim();
  if (!title) return;

  const fontSize = item.fontSize;
  const maxWidth = layout.colorField.width * 0.78;
  const lineHeight = fontSize * 1.35;
  const lines = wrapTitle(context, title, maxWidth, item);
  const blockHeight = lines.length * lineHeight;
  const startY = layout.titleAnchor.y - blockHeight / 2 + lineHeight * 0.72;

  context.fillStyle = readableTextColor(item.themeColor, item.textColorMode);
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.font = `${item.fontWeight} ${fontSize}px ${item.fontFamily}`;
  context.shadowColor = "rgba(0, 0, 0, 0.08)";
  context.shadowBlur = Math.max(0, fontSize * 0.04);
  context.shadowOffsetY = Math.max(1, fontSize * 0.025);

  for (let index = 0; index < lines.length; index += 1) {
    context.fillText(lines[index], layout.titleAnchor.x, startY + index * lineHeight);
  }

  context.shadowColor = "transparent";
}

function wrapTitle(context: CanvasRenderingContext2D, title: string, maxWidth: number, item: PosterItem): string[] {
  context.font = `${item.fontWeight} ${item.fontSize}px ${item.fontFamily}`;
  const manualLines = title.split(/\n/);
  const lines: string[] = [];

  for (const manualLine of manualLines) {
    let current = "";
    for (const character of [...manualLine]) {
      const next = `${current}${character}`;
      if (current && context.measureText(next).width > maxWidth) {
        lines.push(current);
        current = character;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  }

  return lines.slice(0, 4);
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampDay(year: number, monthIndex: number, day: number) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return clampInteger(day, 1, daysInMonth);
}

function pickIconColor(item: PosterItem) {
  const icon = resolveCalendarIcon(item.calendarIcon, item.fileName, item.palette);
  if (icon === "flower") return "#f3c83f";
  if (icon === "sparkle") return "#fff0a3";
  return "#f6d760";
}

function drawCalendarIcon(
  context: CanvasRenderingContext2D,
  icon: Exclude<PosterItem["calendarIcon"], "auto">,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";

  const path = CALENDAR_ICON_PATHS[icon];
  drawSvgLineIcon(context, path, x, y, size, color);

  context.restore();
}

const FLOWER_ICON_PATH =
  "M12 12 C8.7 8.7 8.3 5.8 10 4.4 C11.4 3.2 13.2 4.2 12 12 " +
  "C15.3 8.7 18.2 8.3 19.6 10 C20.8 11.4 19.8 13.2 12 12 " +
  "C15.3 15.3 15.7 18.2 14 19.6 C12.6 20.8 10.8 19.8 12 12 " +
  "C8.7 15.3 5.8 15.7 4.4 14 C3.2 12.6 4.2 10.8 12 12 " +
  "M12 12 m-1.7 0 a1.7 1.7 0 1 0 3.4 0 a1.7 1.7 0 1 0 -3.4 0";

const STAR_ICON_PATH = "M12 3.6 L14.2 9 L20 9.4 L15.5 13.1 L16.9 18.8 L12 15.7 L7.1 18.8 L8.5 13.1 L4 9.4 L9.8 9 Z";

const SPARKLE_ICON_PATH =
  "M12 4.2 C12.7 8.1 14 9.3 17.8 10 C14 10.7 12.7 12 12 15.8 " +
  "C11.3 12 10 10.7 6.2 10 C10 9.3 11.3 8.1 12 4.2 Z " +
  "M18.8 15.4 C19.1 16.9 19.6 17.4 21.1 17.7 C19.6 18 19.1 18.5 18.8 20 " +
  "C18.5 18.5 18 18 16.5 17.7 C18 17.4 18.5 16.9 18.8 15.4 Z " +
  "M5.4 16.8 L5.5 16.8 M6.9 5.5 L7 5.5";

const PETAL_STAR_ICON_PATH =
  "M12 3.7 C13.1 6.9 14.8 8.6 18.1 9.7 C15.2 11.3 14 13.5 14 16.9 " +
  "C11.5 14.7 9.2 14.1 6 15.1 C7.3 12 7.1 9.5 5.2 6.8 C8.6 7.1 10.7 6.2 12 3.7 Z " +
  "M12 8.2 C12.4 9.5 13.1 10.2 14.4 10.7 C13.2 11.3 12.7 12.2 12.7 13.6 " +
  "C11.7 12.7 10.7 12.5 9.4 12.9 C10 11.6 9.9 10.6 9.1 9.5 C10.5 9.6 11.4 9.2 12 8.2 Z";

const CALENDAR_ICON_PATHS: Record<Exclude<PosterItem["calendarIcon"], "auto">, string> = {
  flower: FLOWER_ICON_PATH,
  star: STAR_ICON_PATH,
  sparkle: SPARKLE_ICON_PATH,
  "petal-star": PETAL_STAR_ICON_PATH,
};

function drawSvgLineIcon(context: CanvasRenderingContext2D, svgPath: string, x: number, y: number, size: number, color: string) {
  const path = new Path2D(svgPath);
  const scale = size / 24;

  context.save();
  context.translate(x - size / 2, y - size / 2);
  context.scale(scale, scale);
  context.fillStyle = "transparent";
  context.strokeStyle = "rgba(0, 0, 0, 0.34)";
  context.lineWidth = 3.8;
  context.stroke(path);
  context.strokeStyle = color;
  context.lineWidth = 2.45;
  context.stroke(path);
  context.restore();
}
