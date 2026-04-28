import { describe, expect, it } from "vitest";
import { fitRect, getPosterLayout } from "./layout";

describe("poster layout", () => {
  it("preserves source image ratio in auto layout", () => {
    const layout = getPosterLayout({
      naturalWidth: 1000,
      naturalHeight: 1500,
      layoutMode: "auto",
      fieldMode: "balanced",
    });

    expect(layout.width).toBe(1440);
    expect(layout.imageArea.width / layout.imageArea.height).toBeCloseTo(1000 / 1500, 2);
    expect(layout.colorField.height).toBeGreaterThan(0);
  });

  it("uses fixed ratios for template layouts", () => {
    const layout = getPosterLayout({
      naturalWidth: 1000,
      naturalHeight: 1500,
      layoutMode: "4:5",
      fieldMode: "balanced",
    });

    expect(layout.width / layout.height).toBeCloseTo(4 / 5, 2);
    expect(layout.colorField.height / layout.height).toBeCloseTo(0.42, 2);
  });

  it("fits source rectangles using contain and cover", () => {
    const target = { x: 0, y: 0, width: 100, height: 100 };
    const contain = fitRect(200, 100, target, "contain");
    const cover = fitRect(200, 100, target, "cover");

    expect(contain.width).toBe(100);
    expect(contain.height).toBe(50);
    expect(cover.width).toBe(200);
    expect(cover.height).toBe(100);
  });
});
