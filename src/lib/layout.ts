import type { FieldMode, LayoutMode, PosterItem, PosterLayout, Rect } from "../types";

const TEMPLATE_RATIOS: Record<Exclude<LayoutMode, "auto">, number> = {
  "4:5": 4 / 5,
  "1:1": 1,
  "9:16": 9 / 16,
  "16:9": 16 / 9,
  "3:4": 3 / 4,
  "2:3": 2 / 3,
};

const FIELD_TO_IMAGE: Record<FieldMode, number> = {
  compact: 0.48,
  balanced: 0.7,
  poster: 0.95,
};

const TEMPLATE_FIELD_SHARE: Record<FieldMode, number> = {
  compact: 0.32,
  balanced: 0.42,
  poster: 0.52,
};

export function getPosterLayout(item: Pick<PosterItem, "naturalWidth" | "naturalHeight" | "layoutMode" | "fieldMode">): PosterLayout {
  if (item.layoutMode === "auto") {
    return getAutoLayout(item);
  }

  return getTemplateLayout(item.layoutMode, item.fieldMode);
}

export function fitRect(sourceWidth: number, sourceHeight: number, target: Rect, mode: "contain" | "cover", scale = 1, offsetX = 0, offsetY = 0): Rect {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = target.width / target.height;
  const width = mode === "contain"
    ? sourceRatio > targetRatio ? target.width : target.height * sourceRatio
    : sourceRatio > targetRatio ? target.height * sourceRatio : target.width;
  const height = width / sourceRatio;
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

  return {
    x: target.x + (target.width - scaledWidth) / 2 + offsetX * target.width,
    y: target.y + (target.height - scaledHeight) / 2 + offsetY * target.height,
    width: scaledWidth,
    height: scaledHeight,
  };
}

function getAutoLayout(item: Pick<PosterItem, "naturalWidth" | "naturalHeight" | "fieldMode">): PosterLayout {
  const isLandscape = item.naturalWidth >= item.naturalHeight;
  if (isLandscape) {
    const width = 1920;
    const imageHeight = Math.round(width * (item.naturalHeight / item.naturalWidth));
    const fieldHeight = Math.round(imageHeight * FIELD_TO_IMAGE[item.fieldMode]);
    return buildTopLayout(width, fieldHeight + imageHeight, fieldHeight);
  }

  const height = 1800;
  const imageWidth = Math.round(height * (item.naturalWidth / item.naturalHeight));
  const fieldWidth = Math.round(imageWidth * FIELD_TO_IMAGE[item.fieldMode]);
  return buildRightLayout(imageWidth + fieldWidth, height, fieldWidth);
}

function getTemplateLayout(layoutMode: Exclude<LayoutMode, "auto">, fieldMode: FieldMode): PosterLayout {
  const ratio = TEMPLATE_RATIOS[layoutMode];
  if (ratio >= 1) {
    const width = ratio > 1 ? 1920 : 1440;
    const height = Math.round(width / ratio);
    const fieldHeight = Math.round(height * TEMPLATE_FIELD_SHARE[fieldMode]);
    return buildTopLayout(width, height, fieldHeight);
  }

  const height = 1800;
  const width = Math.round(height * ratio);
  const fieldWidth = Math.round(width * TEMPLATE_FIELD_SHARE[fieldMode]);
  return buildRightLayout(width, height, fieldWidth);
}

function buildTopLayout(width: number, height: number, fieldHeight: number): PosterLayout {
  const colorField = { x: 0, y: 0, width, height: fieldHeight };
  const imageArea = { x: 0, y: fieldHeight, width, height: height - fieldHeight };
  return {
    width,
    height,
    colorField,
    imageArea,
    titleAnchor: {
      x: colorField.width / 2,
      y: colorField.y + colorField.height / 2,
    },
    colorPlacement: "top",
  };
}

function buildRightLayout(width: number, height: number, fieldWidth: number): PosterLayout {
  const imageArea = { x: 0, y: 0, width: width - fieldWidth, height };
  const colorField = { x: imageArea.width, y: 0, width: fieldWidth, height };
  return {
    width,
    height,
    colorField,
    imageArea,
    titleAnchor: {
      x: colorField.x + colorField.width / 2,
      y: colorField.height / 2,
    },
    colorPlacement: "right",
  };
}
