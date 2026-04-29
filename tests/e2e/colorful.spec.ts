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
