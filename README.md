# Chromaloom

Chromaloom is a lightweight browser-only poster maker. Upload an image, extract comfortable theme colors, place a title on a large color field, keep the original image below it, and export the result as PNG.

## Features

- Local-only image processing with no backend.
- Single-image editing first, with batch support for up to nine images.
- Ranked color candidates optimized for large-area comfort and title contrast.
- Auto layout that preserves the uploaded image ratio by default.
- Optional social templates: 4:5, 1:1, 9:16, 16:9, and 3:4.
- Editable title, font, size, weight, color mode, image fit, position, scale, and color-field height.
- Export selected poster as PNG or all posters as a zip.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
```

## GitHub Pages

The app is built as a static Vite site with relative asset paths. Run `npm run build` and publish `dist/` to GitHub Pages.
