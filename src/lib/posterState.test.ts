import { describe, expect, it } from "vitest";
import { applyStyleFrom, createPosterItem, sanitizeFileName } from "./posterState";
import type { ThemeColor } from "../types";

const palette: ThemeColor[] = [
  {
    hex: "#889976",
    rgb: { r: 136, g: 153, b: 118 },
    population: 0.5,
    score: 1,
    contrastInk: 6,
    contrastPaper: 3,
    label: "quiet green",
  },
];

describe("poster state", () => {
  it("creates poster items with palette recommendation", () => {
    const item = createPosterItem({
      id: "one",
      fileName: "temple.jpg",
      imageUrl: "blob:test",
      naturalWidth: 1200,
      naturalHeight: 900,
      palette,
    });

    expect(item.themeColor).toBe("#889976");
    expect(item.fitMode).toBe("contain");
    expect(item.layoutMode).toBe("auto");
    expect(item.colorPosition).toBe("auto");
    expect(item.compositionMode).toBe("poster");
    expect(item.calendarIcon).toBe("auto");
  });

  it("applies style without replacing image-specific palette", () => {
    const source = createPosterItem({
      id: "source",
      fileName: "one.jpg",
      imageUrl: "blob:one",
      naturalWidth: 1200,
      naturalHeight: 900,
      palette,
      title: "山西",
    });
    const target = createPosterItem({
      id: "target",
      fileName: "two.jpg",
      imageUrl: "blob:two",
      naturalWidth: 900,
      naturalHeight: 1200,
      palette: [{ ...palette[0], hex: "#2d314b" }],
    });

    const next = applyStyleFrom({ ...source, compositionMode: "calendar", fieldMode: "poster", colorPosition: "bottom" }, target);

    expect(next.title).toBe("山西");
    expect(next.compositionMode).toBe("calendar");
    expect(next.fieldMode).toBe("poster");
    expect(next.colorPosition).toBe("bottom");
    expect(next.palette[0].hex).toBe("#2d314b");
  });

  it("sanitizes export names", () => {
    expect(sanitizeFileName("山西 · 青龙寺.jpg")).toBe("山西-青龙寺");
    expect(sanitizeFileName("***")).toBe("poster");
  });
});
