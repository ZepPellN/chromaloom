import { describe, expect, it } from "vitest";
import { contrastRatio, extractThemeColors, readableTextColor } from "./color";

describe("color extraction", () => {
  it("returns ranked comfortable theme colors from sampled image data", () => {
    const imageData = {
      width: 12,
      height: 12,
      data: new Uint8ClampedArray(12 * 12 * 4),
    } as ImageData;

    for (let index = 0; index < imageData.data.length; index += 4) {
      const pixel = index / 4;
      const isBlue = pixel % 3 !== 0;
      imageData.data[index] = isBlue ? 112 : 196;
      imageData.data[index + 1] = isBlue ? 143 : 91;
      imageData.data[index + 2] = isBlue ? 164 : 48;
      imageData.data[index + 3] = 255;
    }

    const colors = extractThemeColors(imageData, 4);

    expect(colors.length).toBeGreaterThanOrEqual(2);
    expect(colors[0].hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors[0].score).toBeGreaterThanOrEqual(colors[1].score);
  });

  it("chooses readable text color by contrast", () => {
    expect(readableTextColor("#2d314b")).toBe("#f6f2e8");
    expect(readableTextColor("#94a77c")).toBe("#121412");
  });

  it("computes contrast ratios above one", () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeGreaterThan(20);
  });
});
