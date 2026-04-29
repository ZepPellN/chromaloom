import type { ColorPosition, FieldMode, LayoutMode, PosterItem, PosterLayout, Rect } from "../types";

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

const BASE_LONG_EDGE = 1800;
type ColorPlacement = Exclude<ColorPosition, "auto">;

export function getPosterLayout(item: Pick<PosterItem, "naturalWidth" | "naturalHeight" | "layoutMode" | "fieldMode" | "colorPosition">): PosterLayout {
  if (item.layoutMode === "auto") {
    return getAutoLayout(item);
  }

  return getTemplateLayout(item.layoutMode, item.naturalWidth, item.naturalHeight, item.fieldMode, item.colorPosition);
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

function getAutoLayout(item: Pick<PosterItem, "naturalWidth" | "naturalHeight" | "fieldMode" | "colorPosition">): PosterLayout {
  return buildNaturalLayout(item, resolvePlacement(item.colorPosition, item.naturalWidth, item.naturalHeight));
}

function getTemplateLayout(
  layoutMode: Exclude<LayoutMode, "auto">,
  sourceWidth: number,
  sourceHeight: number,
  fieldMode: FieldMode,
  colorPosition: ColorPosition,
): PosterLayout {
  const targetRatio = TEMPLATE_RATIOS[layoutMode];
  const sourceRatio = sourceWidth / sourceHeight;
  const placement = resolveTemplatePlacement(colorPosition, targetRatio, sourceRatio);

  if ((placement === "top" || placement === "bottom") && targetRatio <= sourceRatio) {
    const width = targetRatio >= 1 ? BASE_LONG_EDGE : Math.round(BASE_LONG_EDGE * targetRatio);
    const imageHeight = Math.round(width / sourceRatio);
    const height = Math.round(width / targetRatio);
    return buildVerticalLayout(placement, width, height, height - imageHeight);
  }

  if ((placement === "left" || placement === "right") && targetRatio >= sourceRatio) {
    const height = targetRatio >= 1 ? Math.round(BASE_LONG_EDGE / targetRatio) : BASE_LONG_EDGE;
    const imageWidth = Math.round(height * sourceRatio);
    const width = Math.round(height * targetRatio);
    return buildHorizontalLayout(placement, width, height, width - imageWidth);
  }

  return buildNaturalLayout({ naturalWidth: sourceWidth, naturalHeight: sourceHeight, fieldMode, colorPosition }, placement);
}

function buildNaturalLayout(
  item: Pick<PosterItem, "naturalWidth" | "naturalHeight" | "fieldMode" | "colorPosition">,
  placement: ColorPlacement,
): PosterLayout {
  const sourceRatio = item.naturalWidth / item.naturalHeight;

  if (placement === "top" || placement === "bottom") {
    const width = 1920;
    const imageHeight = Math.round(width / sourceRatio);
    const fieldHeight = Math.round(imageHeight * FIELD_TO_IMAGE[item.fieldMode]);
    return buildVerticalLayout(placement, width, fieldHeight + imageHeight, fieldHeight);
  }

  const height = 1800;
  const imageWidth = Math.round(height * sourceRatio);
  const fieldWidth = Math.round(imageWidth * FIELD_TO_IMAGE[item.fieldMode]);
  return buildHorizontalLayout(placement, imageWidth + fieldWidth, height, fieldWidth);
}

function resolvePlacement(colorPosition: ColorPosition, sourceWidth: number, sourceHeight: number): ColorPlacement {
  if (colorPosition !== "auto") return colorPosition;
  return sourceWidth >= sourceHeight ? "top" : "right";
}

function resolveTemplatePlacement(colorPosition: ColorPosition, targetRatio: number, sourceRatio: number): ColorPlacement {
  if (colorPosition !== "auto") return colorPosition;
  return targetRatio <= sourceRatio ? "top" : "right";
}

function buildVerticalLayout(placement: "top" | "bottom", width: number, height: number, fieldHeight: number): PosterLayout {
  const normalizedFieldHeight = Math.max(0, fieldHeight);
  const colorField = {
    x: 0,
    y: placement === "top" ? 0 : height - normalizedFieldHeight,
    width,
    height: normalizedFieldHeight,
  };
  const imageArea = {
    x: 0,
    y: placement === "top" ? normalizedFieldHeight : 0,
    width,
    height: height - normalizedFieldHeight,
  };
  return {
    width,
    height,
    colorField,
    imageArea,
    titleAnchor: {
      x: colorField.width / 2,
      y: colorField.y + colorField.height / 2,
    },
    colorPlacement: placement,
  };
}

function buildHorizontalLayout(placement: "left" | "right", width: number, height: number, fieldWidth: number): PosterLayout {
  const normalizedFieldWidth = Math.max(0, fieldWidth);
  const colorField = {
    x: placement === "left" ? 0 : width - normalizedFieldWidth,
    y: 0,
    width: normalizedFieldWidth,
    height,
  };
  const imageArea = {
    x: placement === "left" ? normalizedFieldWidth : 0,
    y: 0,
    width: width - normalizedFieldWidth,
    height,
  };
  return {
    width,
    height,
    colorField,
    imageArea,
    titleAnchor: {
      x: colorField.x + colorField.width / 2,
      y: colorField.height / 2,
    },
    colorPlacement: placement,
  };
}
