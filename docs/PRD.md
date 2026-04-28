# PRD: Chromaloom Poster Maker

## Problem Statement

The user wants a lightweight static web tool for turning uploaded images into quiet editorial color posters. They need the tool to extract theme colors from an image, select a background color that represents the image's mood, place editable title text on that color field, preserve the source image below it, and export the result without a server.

## Solution

Chromaloom is a browser-only poster maker. A user uploads one or up to nine images, each image gets a ranked palette of background candidates, and the app recommends the color most suitable for a large comfortable text field. The user edits a single title, chooses a font treatment, adjusts image fit and color-field height, then exports one PNG or all posters as a zip. The default layout keeps the original image uncropped in Auto mode; template modes allow platform-oriented ratios when needed.

## User Stories

1. As a casual creator, I want to upload a single image, so that I can quickly create a poster from it.
2. As a creator working with temple or mural images, I want the app to extract representative theme colors, so that the poster feels visually connected to the source.
3. As a creator, I want the app to recommend the most comfortable large-area color, so that I do not need to understand color theory.
4. As a creator, I want to see multiple color candidates, so that I can override the automatic recommendation.
5. As a creator, I want the recommended color to keep title text readable, so that exported posters remain legible.
6. As a creator, I want the top area to be a large color field, so that the result resembles the provided reference images.
7. As a creator, I want the original image displayed below the color field, so that the exported poster preserves the source material.
8. As a creator, I want Auto layout to preserve the original image ratio, so that uploads with different orientations do not get damaged by default.
9. As a creator, I want optional ratio templates, so that I can make output for common social formats.
10. As a creator, I want Contain as the default image fit, so that no source content is cropped by surprise.
11. As a creator, I want Cover mode with manual position and scale, so that I can create a more poster-like crop when desired.
12. As a creator, I want to type a main title, so that I can label the place or subject.
13. As a creator, I want basic font controls, so that the title can match the image mood.
14. As a creator, I want automatic black or white title color, so that contrast remains acceptable.
15. As a creator, I want the preview to match the exported PNG, so that I can trust what I see.
16. As a creator, I want to export the selected poster as PNG, so that I can post or archive it.
17. As a creator, I want to upload up to nine images, so that I can process a small set quickly.
18. As a creator, I want each uploaded image to have independent settings, so that different images can have different titles and colors.
19. As a creator, I want to apply the current title or style to all images, so that batch edits stay fast.
20. As a creator, I want to export all posters, so that a small set can be downloaded in one action.
21. As a privacy-conscious user, I want processing to happen locally, so that my images are not uploaded to a server.
22. As a mobile user, I want the workspace to remain usable on a phone, so that I can make a poster from recent photos.
23. As a maintainer, I want lint, unit tests, e2e tests, and build checks in CI, so that GitHub Pages deploys stay reliable.

## Implementation Decisions

- Build a Vite, React, and TypeScript static app suitable for GitHub Pages.
- Use plain global CSS with CSS custom properties; avoid UI frameworks.
- Encapsulate color extraction in a deep module that accepts image data and returns ranked theme candidates.
- Encapsulate poster layout in a deep module that maps poster state to deterministic rectangles and export dimensions.
- Encapsulate canvas rendering in a deep module used by preview and export paths to keep output consistent.
- Support Auto layout plus common templates: 4:5, 1:1, 9:16, 16:9, and 3:4.
- Default image fit is Contain. Cover mode supports position and scale controls.
- Default typography uses system Chinese serif options with editable size, weight, and font family.
- Batch processing is capped at nine images.
- Export selected poster as PNG and all posters as a zip of PNG files.
- No server, API, database, login, or image upload is required.

## Testing Decisions

- Good tests assert external behavior: palette ranking characteristics, layout dimensions, render/export availability, and user-visible flows.
- Unit test color utilities, poster layout, and state helpers because they are deep modules with stable interfaces.
- E2E test upload, palette selection, title editing, preview rendering, and export button availability with generated local test images.
- CI should run lint, unit tests, e2e tests, and production build on every pull request and push.

## Out of Scope

- AI image understanding, semantic subject detection, and automatic smart cropping.
- Cloud storage, accounts, collaboration, or saved history.
- Complex text layout with subtitles, logos, watermarks, or rich text spans.
- Heavy webfont downloads in the MVP.
- More than nine images in one batch.

## Further Notes

GitHub issues could not be created from this local repo yet because no GitHub remote is configured. This PRD is stored locally and can be submitted as a GitHub issue once a remote exists.
