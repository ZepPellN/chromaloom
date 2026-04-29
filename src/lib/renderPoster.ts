import { readableTextColor } from "./color";
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

  drawTitle(context, item, layout);
  return layout;
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
