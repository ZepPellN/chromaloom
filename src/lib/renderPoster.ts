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
      drawCalendarIcon(context, resolveCalendarIcon(item.calendarIcon, item.fileName, item.palette), x + daySize * 0.72, y + daySize * 0.16, daySize * 0.42, iconColor);
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
  const text = readableTextColor(item.themeColor, item.textColorMode);
  if (resolveCalendarIcon(item.calendarIcon, item.fileName, item.palette) === "flower") return "#f3c83f";
  return text;
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
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = Math.max(2, size * 0.12);
  context.lineCap = "round";
  context.lineJoin = "round";

  if (icon === "flower") drawFlower(context, x, y, size, color);
  else if (icon === "sun") drawSun(context, x, y, size);
  else if (icon === "leaf") drawLeaf(context, x, y, size);
  else if (icon === "water") drawWater(context, x, y, size);
  else if (icon === "mountain") drawMountain(context, x, y, size);
  else if (icon === "moon") drawMoon(context, x, y, size);
  else drawDot(context, x, y, size);

  context.restore();
}

function drawFlower(context: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const petal = size * 0.34;
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    context.beginPath();
    context.ellipse(x + Math.cos(angle) * petal, y + Math.sin(angle) * petal, petal * 0.42, petal * 0.72, angle, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = color === "#f3c83f" ? "#7a5a13" : color;
  context.beginPath();
  context.arc(x, y, size * 0.16, 0, Math.PI * 2);
  context.fill();
}

function drawSun(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.beginPath();
  context.arc(x, y, size * 0.28, 0, Math.PI * 2);
  context.fill();
  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI * 2 * index) / 10;
    context.beginPath();
    context.moveTo(x + Math.cos(angle) * size * 0.45, y + Math.sin(angle) * size * 0.45);
    context.lineTo(x + Math.cos(angle) * size * 0.68, y + Math.sin(angle) * size * 0.68);
    context.stroke();
  }
}

function drawLeaf(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.beginPath();
  context.ellipse(x, y, size * 0.32, size * 0.58, Math.PI / 4, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(x - size * 0.28, y + size * 0.32);
  context.lineTo(x + size * 0.3, y - size * 0.34);
  context.stroke();
}

function drawWater(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  for (let row = 0; row < 2; row += 1) {
    context.beginPath();
    context.moveTo(x - size * 0.52, y - size * 0.12 + row * size * 0.32);
    context.quadraticCurveTo(x - size * 0.24, y - size * 0.32 + row * size * 0.32, x, y - size * 0.12 + row * size * 0.32);
    context.quadraticCurveTo(x + size * 0.24, y + size * 0.08 + row * size * 0.32, x + size * 0.52, y - size * 0.12 + row * size * 0.32);
    context.stroke();
  }
}

function drawMountain(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.beginPath();
  context.moveTo(x - size * 0.6, y + size * 0.38);
  context.lineTo(x - size * 0.18, y - size * 0.38);
  context.lineTo(x + size * 0.1, y + size * 0.08);
  context.lineTo(x + size * 0.32, y - size * 0.22);
  context.lineTo(x + size * 0.62, y + size * 0.38);
  context.closePath();
  context.stroke();
}

function drawMoon(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.beginPath();
  context.arc(x, y, size * 0.48, Math.PI * 0.18, Math.PI * 1.72);
  context.quadraticCurveTo(x - size * 0.05, y, x + size * 0.34, y - size * 0.42);
  context.fill();
}

function drawDot(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.beginPath();
  context.arc(x, y, size * 0.28, 0, Math.PI * 2);
  context.fill();
}
