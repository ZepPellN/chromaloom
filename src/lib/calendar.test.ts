import { describe, expect, it } from "vitest";
import { parseDateFromFileName, recommendCalendarIcon } from "./calendar";
import type { ThemeColor } from "../types";

const greenPalette: ThemeColor[] = [
  {
    hex: "#6d8455",
    rgb: { r: 109, g: 132, b: 85 },
    population: 1,
    score: 1,
    contrastInk: 6,
    contrastPaper: 3,
    label: "quiet green",
  },
];

describe("calendar helpers", () => {
  it("parses common date strings from file names", () => {
    expect(parseDateFromFileName("IMG_20260421_120000.jpg")).toEqual({ year: 2026, month: 4, day: 21 });
    expect(parseDateFromFileName("flowers-2026-04-21.jpeg")).toEqual({ year: 2026, month: 4, day: 21 });
    expect(parseDateFromFileName("bad-2026-02-31.jpg")).toBeNull();
  });

  it("recommends an icon from filename before palette", () => {
    expect(recommendCalendarIcon("roadside-flower.jpg", greenPalette)).toBe("flower");
    expect(["flower", "star"]).toContain(recommendCalendarIcon("plain.jpg", greenPalette));
  });
});
