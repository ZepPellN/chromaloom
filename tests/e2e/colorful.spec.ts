import { expect, test } from "@playwright/test";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <rect width="900" height="1200" fill="#7891a6"/>
  <rect y="560" width="900" height="640" fill="#ba6535"/>
  <circle cx="460" cy="720" r="210" fill="#8c9d75"/>
  <path d="M120 980 C280 760 590 1060 780 780" stroke="#263245" stroke-width="70" fill="none"/>
</svg>`;

test("creates and exports a poster from an uploaded image", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Choose images").setInputFiles({
    name: "temple.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(svg),
  });

  await expect(page.getByText("Processed 1 image.")).toBeVisible();
  await expect(page.getByText("Export frame")).toBeVisible();
  await expect(page.getByText("Ratio")).toHaveCount(0);
  const previewCanvas = page.getByLabel("Poster preview canvas");
  await expect(previewCanvas).toBeVisible();
  const canvasRatio = await previewCanvas.evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const box = element.getBoundingClientRect();
    return {
      intrinsic: element.width / element.height,
      displayed: box.width / box.height,
    };
  });
  expect(canvasRatio.intrinsic).toBeGreaterThan(1);
  expect(canvasRatio.displayed).toBeCloseTo(canvasRatio.intrinsic, 1);

  await page.getByLabel("Title").fill("山西·青龙寺");
  await page.getByRole("button", { name: "4:5" }).click();
  await page.getByRole("button", { name: "cover" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toContain("山西-青龙寺");
  await expect(page.getByRole("link", { name: "Ready" })).toBeVisible();
});

test("falls back to browser download when the save picker is cancelled", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Mobile skips the save picker and uses browser download directly.");

  await page.addInitScript(() => {
    window.showSaveFilePicker = async () => {
      throw new DOMException("The user aborted a request.", "AbortError");
    };
  });
  await page.goto("/");

  await page.getByLabel("Choose images").setInputFiles({
    name: "temple.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(svg),
  });

  await expect(page.getByText("Processed 1 image.")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toContain("temple-poster");
  await expect(page.getByRole("link", { name: "Ready" })).toBeVisible();
  await expect(page.getByText("PNG save cancelled.")).toHaveCount(0);
  await expect(page.getByText("Save picker closed. PNG download is ready.")).toBeVisible();
});

test("shares the selected poster as a PNG file", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: (data: ShareData) => Boolean(data.files?.length),
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        window.sessionStorage.setItem("shared-file-name", data.files?.[0]?.name ?? "");
      },
    });
  });
  await page.goto("/");

  await page.getByLabel("Choose images").setInputFiles({
    name: "temple.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(svg),
  });

  await expect(page.getByText("Processed 1 image.")).toBeVisible();
  await page.getByRole("button", { name: "Share" }).click();

  await expect(page.getByRole("link", { name: "Ready" })).toBeVisible();
  await expect(page.getByText("Share sheet opened. Choose Save Image to add it to Photos.")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem("shared-file-name"))).toContain("temple-poster.png");
});
