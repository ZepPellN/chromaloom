export type FitMode = "contain" | "cover";
export type LayoutMode = "auto" | "4:5" | "1:1" | "9:16" | "16:9" | "3:4" | "2:3";
export type FieldMode = "compact" | "balanced" | "poster";
export type TextColorMode = "auto" | "ink" | "paper";

export interface ThemeColor {
  hex: string;
  rgb: Rgb;
  population: number;
  score: number;
  contrastInk: number;
  contrastPaper: number;
  label: string;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface ImageTransform {
  x: number;
  y: number;
  scale: number;
}

export interface PosterSettings {
  title: string;
  themeColor: string;
  palette: ThemeColor[];
  layoutMode: LayoutMode;
  fieldMode: FieldMode;
  fitMode: FitMode;
  textColorMode: TextColorMode;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  imageTransform: ImageTransform;
}

export interface PosterItem extends PosterSettings {
  id: string;
  fileName: string;
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  createdAt: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PosterLayout {
  width: number;
  height: number;
  colorField: Rect;
  imageArea: Rect;
  titleAnchor: { x: number; y: number };
  colorPlacement: "top" | "right";
}

export interface LoadedImage {
  element: HTMLImageElement;
  width: number;
  height: number;
}
