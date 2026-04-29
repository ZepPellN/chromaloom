import { describe, expect, it } from "vitest";
import { fitRect, getPosterLayout } from "./layout";

describe("poster layout", () => {
  it("puts the color field on the right for portrait auto layout", () => {
    const layout = getPosterLayout({
      naturalWidth: 1000,
      naturalHeight: 1500,
      layoutMode: "auto",
      fieldMode: "balanced",
      colorPosition: "auto",
    });

    expect(layout.colorPlacement).toBe("right");
    expect(layout.imageArea.width / layout.imageArea.height).toBeCloseTo(1000 / 1500, 2);
    expect(layout.colorField.x).toBe(layout.imageArea.width);
    expect(layout.colorField.height).toBe(layout.height);
  });

  it("puts the color field on top for landscape auto layout", () => {
    const layout = getPosterLayout({
      naturalWidth: 1600,
      naturalHeight: 900,
      layoutMode: "auto",
      fieldMode: "balanced",
      colorPosition: "auto",
    });

    expect(layout.colorPlacement).toBe("top");
    expect(layout.imageArea.width / layout.imageArea.height).toBeCloseTo(1600 / 900, 2);
    expect(layout.colorField.width).toBe(layout.width);
    expect(layout.colorField.y).toBe(0);
  });

  it("adjusts the whole frame while preserving the image ratio for templates", () => {
    const layout = getPosterLayout({
      naturalWidth: 7956,
      naturalHeight: 5300,
      layoutMode: "16:9",
      fieldMode: "balanced",
      colorPosition: "auto",
    });

    expect(layout.width / layout.height).toBeCloseTo(16 / 9, 2);
    expect(layout.imageArea.width / layout.imageArea.height).toBeCloseTo(7956 / 5300, 2);
    expect(layout.colorPlacement).toBe("right");
    expect(layout.colorField.x).toBe(layout.imageArea.width);
  });

  it("uses the top color area when a template needs extra height", () => {
    const layout = getPosterLayout({
      naturalWidth: 7956,
      naturalHeight: 5300,
      layoutMode: "4:5",
      fieldMode: "balanced",
      colorPosition: "auto",
    });

    expect(layout.width / layout.height).toBeCloseTo(4 / 5, 2);
    expect(layout.imageArea.width / layout.imageArea.height).toBeCloseTo(7956 / 5300, 2);
    expect(layout.colorPlacement).toBe("top");
    expect(layout.colorField.y).toBe(0);
  });

  it("honors manual bottom and left color positions in auto layout", () => {
    const bottom = getPosterLayout({
      naturalWidth: 1600,
      naturalHeight: 900,
      layoutMode: "auto",
      fieldMode: "balanced",
      colorPosition: "bottom",
    });
    const left = getPosterLayout({
      naturalWidth: 1000,
      naturalHeight: 1500,
      layoutMode: "auto",
      fieldMode: "balanced",
      colorPosition: "left",
    });

    expect(bottom.colorPlacement).toBe("bottom");
    expect(bottom.imageArea.y).toBe(0);
    expect(bottom.colorField.y).toBe(bottom.imageArea.height);
    expect(bottom.imageArea.width / bottom.imageArea.height).toBeCloseTo(1600 / 900, 2);

    expect(left.colorPlacement).toBe("left");
    expect(left.colorField.x).toBe(0);
    expect(left.imageArea.x).toBe(left.colorField.width);
    expect(left.imageArea.width / left.imageArea.height).toBeCloseTo(1000 / 1500, 2);
  });

  it("keeps manual placement when a frame preset cannot match that side", () => {
    const layout = getPosterLayout({
      naturalWidth: 1600,
      naturalHeight: 900,
      layoutMode: "16:9",
      fieldMode: "balanced",
      colorPosition: "top",
    });

    expect(layout.colorPlacement).toBe("top");
    expect(layout.imageArea.width / layout.imageArea.height).toBeCloseTo(1600 / 900, 2);
    expect(layout.width / layout.height).toBeLessThan(16 / 9);
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
