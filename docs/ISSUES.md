# Issue Breakdown

## 1. Bootstrap the static poster workspace

**Type:** AFK

**Blocked by:** None - can start immediately

**User stories covered:** 1, 22, 23

### What to build

Create the Vite React TypeScript app shell, project documentation, lint/build/test scripts, and a quiet editorial workspace layout that can run locally and on GitHub Pages.

### Acceptance criteria

- [ ] The app starts locally with a usable first screen.
- [ ] README and AGENTS document project goals, workflow, and verification commands.
- [ ] Lint, unit test, e2e test, and build scripts exist.

## 2. Upload images and extract comfortable theme colors

**Type:** AFK

**Blocked by:** Issue 1

**User stories covered:** 1, 2, 3, 4, 5, 17, 21

### What to build

Allow one to nine local image uploads, sample each image in the browser, rank candidate colors for large-area comfort and text readability, and display selectable swatches.

### Acceptance criteria

- [ ] Uploading supported images creates poster items without server calls.
- [ ] Each item receives multiple ranked color candidates.
- [ ] The first candidate is applied automatically and remains editable.
- [ ] Unit tests cover color ranking and contrast behavior.

## 3. Render an editable poster preview

**Type:** AFK

**Blocked by:** Issues 1 and 2

**User stories covered:** 6, 7, 8, 9, 10, 11, 12, 13, 14, 15

### What to build

Render a deterministic canvas preview with a color field above the source image, editable title text, layout presets, field-height controls, font controls, and image fit controls.

### Acceptance criteria

- [ ] Preview updates when title, color, font, layout, or image fit changes.
- [ ] Auto layout preserves the source image ratio by default.
- [ ] Template layouts and Cover controls are available.
- [ ] Unit tests cover layout calculations.

## 4. Export selected and batch posters

**Type:** AFK

**Blocked by:** Issue 3

**User stories covered:** 16, 18, 19, 20

### What to build

Use the same renderer for export as preview, export the selected poster as PNG, apply current title/style to all posters, and export all current posters as a zip.

### Acceptance criteria

- [ ] Selected poster export produces a PNG download.
- [ ] Batch export produces a zip with one PNG per poster.
- [ ] Applying title/style to all updates every current poster.
- [ ] E2E tests cover the happy path through upload, edit, and export controls.

## 5. Add CI validation for daily acceptance

**Type:** AFK

**Blocked by:** Issues 1 through 4

**User stories covered:** 23

### What to build

Add GitHub Actions validation that installs dependencies, runs lint, unit tests, e2e tests, and the production build.

### Acceptance criteria

- [ ] CI runs on push and pull request.
- [ ] CI installs Playwright browsers.
- [ ] CI executes lint, unit tests, e2e tests, and build.
