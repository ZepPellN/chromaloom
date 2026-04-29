# AGENTS.md

## Project Goal

Build Chromaloom as a pure front-end poster maker for GitHub Pages. The product should stay lightweight, local-first, and useful for quickly turning uploaded images into editorial color posters.

## Product Vocabulary

- **Poster**: The exportable composition containing a color area and the source image.
- **Theme color**: A ranked color candidate extracted from the source image and suitable for a large background.
- **Color area**: The area filled with the selected theme color. It sits above landscape or square photos and to the right of portrait photos in Auto layout.
- **Source image**: The uploaded image rendered without distortion.
- **Auto layout**: A layout mode that preserves the source image ratio and derives the export frame from the image orientation.
- **Template layout**: A fixed export frame such as 4:5, 1:1, 9:16, 16:9, 3:4, or 2:3. The whole poster frame changes while the source image area keeps the image's original ratio.

## Engineering Rules

- Keep image processing in the browser. Do not add a backend unless the product direction changes.
- Keep preview and export visually consistent by using shared layout and rendering code.
- Prefer small, testable pure modules for color extraction, poster layout, and state transforms.
- Keep batch processing capped at nine images unless performance is explicitly revisited.
- Use conventional commits: `feat`, `fix`, `docs`, `chore`, `test`.
- Before handoff, run lint, unit tests, production build, and e2e tests when possible.

## UI Direction

Use a minimalist photo-workspace interface: warm monochrome surfaces, crisp borders, restrained controls, and a dark preview well that keeps attention on the image. The exported poster carries the visual drama.
