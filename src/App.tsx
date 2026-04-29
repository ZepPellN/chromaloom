import JSZip from "jszip";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { readableTextColor } from "./lib/color";
import { inferCalendarDate, recommendCalendarIcon } from "./lib/calendar";
import { extractThemeColorsFromImage, fileToImage, loadImageElement } from "./lib/image";
import { renderPoster } from "./lib/renderPoster";
import {
  DEFAULT_FONT,
  MAX_BATCH,
  applyStyleFrom,
  calendarIcons,
  colorPositions,
  compositionModes,
  createPosterItem,
  fieldModes,
  fitModes,
  layoutModes,
  sanitizeFileName,
  textColorModes,
  updatePosterSetting,
} from "./lib/posterState";
import type { CalendarIcon, ColorPosition, CompositionMode, FieldMode, FitMode, LayoutMode, LoadedImage, PosterItem, TextColorMode } from "./types";

const FONT_OPTIONS = [
  { label: "Songti", value: DEFAULT_FONT },
  { label: "Kaiti", value: `"Kaiti SC", "STKaiti", "KaiTi", serif` },
  { label: "PingFang", value: `"PingFang SC", "Hiragino Sans GB", sans-serif` },
  { label: "Serif", value: `Georgia, "Times New Roman", serif` },
];

const MAX_FAILURE_NAMES = 3;

function App() {
  const [items, setItems] = useState<PosterItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, LoadedImage>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("Upload one image to start.");
  const [exportStatus, setExportStatus] = useState("");
  const [readyDownload, setReadyDownload] = useState<{ url: string; fileName: string } | null>(null);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? items[0], [items, selectedId]);

  useEffect(() => {
    return () => {
      if (readyDownload) revokeDownloadUrl(readyDownload.url);
    };
  }, [readyDownload]);

  async function handleFiles(files: readonly File[] | null) {
    if (!files?.length) return;

    const remaining = MAX_BATCH - items.length;
    if (remaining <= 0) {
      setStatus(`Batch limit reached. Keep it to ${MAX_BATCH} images for a fast local workflow.`);
      return;
    }

    setIsProcessing(true);
    const nextItems: PosterItem[] = [];
    const nextImages: Record<string, LoadedImage> = {};
    const failures: string[] = [];

    try {
      for (const file of files.slice(0, remaining)) {
        if (!file.type.startsWith("image/")) {
          failures.push(file.name || "Untitled file");
          continue;
        }

        try {
          const calendarDate = await inferCalendarDate(file);
          const loaded = await fileToImage(file);
          const palette = extractThemeColorsFromImage(loaded.element);
          const item = createPosterItem({
            id: crypto.randomUUID(),
            fileName: file.name,
            imageUrl: loaded.url,
            naturalWidth: loaded.width,
            naturalHeight: loaded.height,
            palette,
            calendarYear: calendarDate.year,
            calendarMonth: calendarDate.month,
            calendarDay: calendarDate.day,
            calendarIcon: recommendCalendarIcon(file.name, palette),
          });
          nextItems.push(item);
          nextImages[item.id] = loaded;
        } catch {
          failures.push(file.name || "Untitled image");
        }
      }

      setItems((current) => [...current, ...nextItems]);
      setLoadedImages((current) => ({ ...current, ...nextImages }));
      if (nextItems[0]) setSelectedId(nextItems[0].id);
      setStatus(formatImportStatus(nextItems.length, failures));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not process image.");
    } finally {
      setIsProcessing(false);
    }
  }

  function formatImportStatus(importedCount: number, failures: string[]) {
    const imported = importedCount > 0
      ? `Processed ${importedCount} image${importedCount > 1 ? "s" : ""}.`
      : "";

    if (!failures.length) return imported || "No supported images found.";

    const visibleNames = failures.slice(0, MAX_FAILURE_NAMES).join(", ");
    const extraCount = failures.length - MAX_FAILURE_NAMES;
    const failed = `Could not decode ${failures.length} file${failures.length > 1 ? "s" : ""}: ${visibleNames}${extraCount > 0 ? `, +${extraCount} more` : ""}. Try JPEG, PNG, WebP, or another browser-supported image.`;

    return imported ? `${imported} ${failed}` : failed;
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    void handleFiles(files).finally(() => {
      input.value = "";
    });
  }

  function updateSelected(next: PosterItem) {
    setItems((current) => current.map((item) => (item.id === next.id ? next : item)));
  }

  function removeSelected() {
    if (!selected) return;
    URL.revokeObjectURL(selected.imageUrl);
    const nextItems = items.filter((item) => item.id !== selected.id);
    setItems(nextItems);
    setSelectedId(nextItems[0]?.id ?? null);
    setLoadedImages((current) => {
      const copy = { ...current };
      delete copy[selected.id];
      return copy;
    });
  }

  async function exportSelected() {
    if (!selected) return;
    const output = await renderSelectedPng();
    if (!output) return;
    const { blob, fileName } = output;
    const url = createReadyDownload(blob, fileName);
    const filePicker = await openSaveFilePicker(fileName, "image/png", [".png"]);

    if (filePicker && filePicker !== "cancelled") {
      await writeBlobToFile(filePicker, blob);
      setExportStatus("PNG saved.");
      return;
    }

    downloadBlobUrl(url, fileName);
    setExportStatus(filePicker === "cancelled"
      ? "Save picker closed. PNG download is ready."
      : "PNG download started. If the browser prompt interrupted it, use the Ready link.");
  }

  async function shareSelected() {
    if (!selected) return;
    const output = await renderSelectedPng();
    if (!output) return;
    const { blob, fileName } = output;
    const file = new File([blob], fileName, { type: "image/png" });
    const url = createReadyDownload(blob, fileName);

    if (canShareFile(file)) {
      try {
        await navigator.share({
          files: [file],
          title: "Chromaloom poster",
        });
        setExportStatus("Share sheet opened. Choose Save Image to add it to Photos.");
        return;
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          throw error;
        }
      }
    }

    downloadBlobUrl(url, fileName);
    setExportStatus("Share is unavailable here. PNG download is ready.");
  }

  async function exportAll() {
    if (!items.length) return;
    setExportStatus("Preparing zip...");

    const zip = new JSZip();
    for (const item of items) {
      const blob = await renderToBlob(item, loadedImages[item.id]);
      zip.file(`${sanitizeFileName(item.title || item.fileName)}-${items.indexOf(item) + 1}.png`, blob);
    }
    const archive = await zip.generateAsync({ type: "blob" });
    const fileName = "chromaloom-posters.zip";
    const url = createReadyDownload(archive, fileName);
    const filePicker = await openSaveFilePicker(fileName, "application/zip", [".zip"]);

    if (filePicker && filePicker !== "cancelled") {
      await writeBlobToFile(filePicker, archive);
      setExportStatus("Zip saved.");
      return;
    }

    downloadBlobUrl(url, fileName);
    setExportStatus(filePicker === "cancelled"
      ? "Save picker closed. Zip download is ready."
      : "Zip download started. If the browser prompt interrupted it, use the Ready link.");
  }

  function createReadyDownload(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    if (readyDownload) revokeDownloadUrl(readyDownload.url);
    setReadyDownload({ url, fileName });
    return url;
  }

  function applyCurrentStyleToAll() {
    if (!selected) return;
    setItems((current) => current.map((item) => (item.id === selected.id ? item : applyStyleFrom(selected, item))));
  }

  async function renderSelectedPng() {
    if (!selected) return null;
    const image = loadedImages[selected.id];
    if (!image) {
      setExportStatus("Image is still loading. Try again in a moment.");
      return null;
    }

    const canvas = document.createElement("canvas");
    renderPoster(canvas, selected, image);
    const fileName = `${sanitizeFileName(selected.title || selected.fileName)}-poster.png`;
    const blob = await canvasToBlob(canvas, "image/png");
    return { blob, fileName };
  }

  async function renderToBlob(item: PosterItem, loaded?: LoadedImage): Promise<Blob> {
    const image = loaded ?? (await loadImageElement(item.imageUrl));
    const canvas = document.createElement("canvas");
    renderPoster(canvas, item, image);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not export poster."));
      }, "image/png");
    });
  }

  return (
    <main className="app-shell">
      <section className="masthead" aria-label="Chromaloom overview">
        <div>
          <p className="eyebrow">Local photo color studio</p>
          <h1>Chromaloom</h1>
        </div>
        <div className="masthead-actions">
          <label className="button primary">
            <span>Upload images</span>
            <input type="file" accept="image/*" multiple onChange={handleFileInput} />
          </label>
        </div>
      </section>

      <section className="workspace" aria-label="Poster workspace">
        <aside className="side-panel upload-panel">
          <UploadPanel count={items.length} isProcessing={isProcessing} status={status} onFiles={handleFiles} />
          <BatchStrip items={items} selectedId={selected?.id} onSelect={setSelectedId} />
        </aside>

        <section className="preview-panel" aria-label="Poster preview">
          {selected ? (
            <PosterPreview
              item={selected}
              image={loadedImages[selected.id]}
              onChange={updateSelected}
            />
          ) : (
            <div className="empty-preview">
              <p>Drop in a mural, temple detail, travel photo, or any image with a color mood worth keeping.</p>
            </div>
          )}
        </section>

        <aside className="side-panel control-panel">
          {selected ? (
            <Controls
              item={selected}
              onChange={updateSelected}
              onRemove={removeSelected}
              onApplyAll={applyCurrentStyleToAll}
              onExportPng={exportSelected}
              onSharePng={shareSelected}
              onExportAll={exportAll}
              readyDownload={readyDownload}
              exportStatus={exportStatus}
              clearReadyDownload={() => setReadyDownload(null)}
            />
          ) : (
            <div className="quiet-note">Controls appear after the first upload.</div>
          )}
        </aside>
      </section>
    </main>
  );
}

function UploadPanel({ count, isProcessing, status, onFiles }: {
  count: number;
  isProcessing: boolean;
  status: string;
  onFiles: (files: readonly File[] | null) => Promise<void>;
}) {
  function handlePanelInput(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    void onFiles(files).finally(() => {
      input.value = "";
    });
  }

  return (
    <div className="drop-zone">
      <h2>Images</h2>
      <p>{status}</p>
      <label className="button ghost full">
        <span>{isProcessing ? "Reading colors" : count ? "Add more" : "Choose images"}</span>
        <input type="file" accept="image/*" multiple onChange={handlePanelInput} />
      </label>
      <p className="batch-count">{count}/{MAX_BATCH} in this batch</p>
    </div>
  );
}

function BatchStrip({ items, selectedId, onSelect }: {
  items: PosterItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (!items.length) return null;

  return (
    <div className="batch-strip" aria-label="Uploaded posters">
      {items.map((item, index) => (
        <button
          className={`thumb ${item.id === selectedId ? "selected" : ""}`}
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          aria-label={`Select poster ${index + 1}`}
        >
          <span className="thumb-swatch" style={{ background: item.themeColor }} />
          <img src={item.imageUrl} alt="" loading="lazy" />
        </button>
      ))}
    </div>
  );
}

function PosterPreview({ item, image, onChange }: {
  item: PosterItem;
  image?: LoadedImage;
  onChange: (item: PosterItem) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !image) return;
    renderPoster(canvasRef.current, item, image, { previewScale: 0.5 });
  }, [image, item]);

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (item.fitMode !== "cover") return;
    dragRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current || item.fitMode !== "cover") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - dragRef.current.x) / rect.width;
    const dy = (event.clientY - dragRef.current.y) / rect.height;
    dragRef.current = { x: event.clientX, y: event.clientY };
    onChange({
      ...item,
      imageTransform: {
        ...item.imageTransform,
        x: item.imageTransform.x + dx,
        y: item.imageTransform.y + dy,
      },
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  return (
    <div className="preview-wrap">
      <canvas
        ref={canvasRef}
        className={`poster-canvas ${item.fitMode === "cover" ? "draggable" : ""}`}
        aria-label="Poster preview canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      <div className="preview-meta">
        <span>{item.layoutMode === "auto" ? "Auto frame" : `${item.layoutMode} frame`}</span>
        <span>{item.fitMode}</span>
        <span>{item.naturalWidth}x{item.naturalHeight}</span>
      </div>
    </div>
  );
}

function Controls({
  item,
  onChange,
  onRemove,
  onApplyAll,
  onExportPng,
  onSharePng,
  onExportAll,
  readyDownload,
  exportStatus,
  clearReadyDownload,
}: {
  item: PosterItem;
  onChange: (item: PosterItem) => void;
  onRemove: () => void;
  onApplyAll: () => void;
  onExportPng: () => Promise<void>;
  onSharePng: () => Promise<void>;
  onExportAll: () => Promise<void>;
  readyDownload: { url: string; fileName: string } | null;
  exportStatus: string;
  clearReadyDownload: () => void;
}) {
  return (
    <div className="controls">
      <div className="export-dock" aria-label="Export actions">
        <div>
          <p className="eyebrow">Export</p>
          <h2>Ready when the frame is right.</h2>
        </div>
        <div className="export-actions">
          <button className="button primary" type="button" onClick={() => void onExportPng()}>PNG</button>
          <button className="button" type="button" onClick={() => void onSharePng()}>Share</button>
          <button className="button" type="button" onClick={() => void onExportAll()}>Zip</button>
          {readyDownload ? (
            <a
              className="button primary"
              href={readyDownload.url}
              download={readyDownload.fileName}
              onClick={() => {
                window.setTimeout(() => {
                  revokeDownloadUrl(readyDownload.url);
                  clearReadyDownload();
                }, 5_000);
              }}
            >
              Ready
            </a>
          ) : null}
        </div>
        {exportStatus ? <p className="export-status" role="status">{exportStatus}</p> : null}
      </div>

      <div className="control-title">
        <h2>Poster settings</h2>
      </div>

      <Segmented<CompositionMode>
        label="Mode"
        value={item.compositionMode}
        values={compositionModes}
        onChange={(value) => onChange(updatePosterSetting(item, "compositionMode", value))}
      />

      <label className="field">
        <span>Title</span>
        <textarea
          value={item.title}
          placeholder="山西·樱山青龙寺"
          rows={3}
          onChange={(event) => onChange(updatePosterSetting(item, "title", event.target.value))}
        />
      </label>

      <div className="swatches" aria-label="Theme colors">
        {item.palette.map((color) => (
          <button
            className={`swatch ${color.hex === item.themeColor ? "selected" : ""}`}
            key={color.hex}
            type="button"
            title={`${color.label} ${color.hex}`}
            aria-label={`Use ${color.hex}`}
            style={{ background: color.hex, color: readableTextColor(color.hex) }}
            onClick={() => onChange(updatePosterSetting(item, "themeColor", color.hex))}
          >
            <span>{color.hex}</span>
          </button>
        ))}
      </div>

      <label className="field">
        <span>Custom color</span>
        <input
          type="color"
          value={item.themeColor}
          onChange={(event) => onChange(updatePosterSetting(item, "themeColor", event.target.value))}
        />
      </label>

      <Segmented<LayoutMode>
        label="Export frame"
        value={item.layoutMode}
        values={layoutModes}
        onChange={(value) => onChange(updatePosterSetting(item, "layoutMode", value))}
      />

      <Segmented<FieldMode>
        label="Color area"
        value={item.fieldMode}
        values={fieldModes}
        onChange={(value) => onChange(updatePosterSetting(item, "fieldMode", value))}
      />

      <Segmented<ColorPosition>
        label="Color position"
        value={item.colorPosition}
        values={colorPositions}
        onChange={(value) => onChange(updatePosterSetting(item, "colorPosition", value))}
      />

      {item.compositionMode === "calendar" ? (
        <>
          <div className="field-grid three">
            <label className="field">
              <span>Year</span>
              <input
                type="number"
                min="1900"
                max="2100"
                value={item.calendarYear}
                onChange={(event) => onChange(updatePosterSetting(item, "calendarYear", Number(event.target.value)))}
              />
            </label>
            <label className="field">
              <span>Month</span>
              <input
                type="number"
                min="1"
                max="12"
                value={item.calendarMonth}
                onChange={(event) => onChange(updatePosterSetting(item, "calendarMonth", Number(event.target.value)))}
              />
            </label>
            <label className="field">
              <span>Day</span>
              <input
                type="number"
                min="1"
                max="31"
                value={item.calendarDay}
                onChange={(event) => onChange(updatePosterSetting(item, "calendarDay", Number(event.target.value)))}
              />
            </label>
          </div>

          <Segmented<CalendarIcon>
            label="Calendar icon"
            value={item.calendarIcon}
            values={calendarIcons}
            onChange={(value) => onChange(updatePosterSetting(item, "calendarIcon", value))}
          />
        </>
      ) : null}

      <Segmented<FitMode>
        label="Photo fit"
        value={item.fitMode}
        values={fitModes}
        onChange={(value) => onChange(updatePosterSetting(item, "fitMode", value))}
      />

      {item.fitMode === "cover" ? (
        <div className="field-grid">
          <label className="field">
            <span>Zoom</span>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.02"
              value={item.imageTransform.scale}
              onChange={(event) => onChange({
                ...item,
                imageTransform: { ...item.imageTransform, scale: Number(event.target.value) },
              })}
            />
          </label>
          <button
            className="button ghost"
            type="button"
            onClick={() => onChange({ ...item, imageTransform: { x: 0, y: 0, scale: 1 } })}
          >
            Reset crop
          </button>
        </div>
      ) : null}

      <div className="control-title small">
        <h3>Type</h3>
      </div>

      <label className="field">
        <span>Font</span>
        <select value={item.fontFamily} onChange={(event) => onChange(updatePosterSetting(item, "fontFamily", event.target.value))}>
          {FONT_OPTIONS.map((font) => (
            <option value={font.value} key={font.label}>{font.label}</option>
          ))}
        </select>
      </label>

      <div className="field-grid two">
        <label className="field">
          <span>Size</span>
          <input
            type="number"
            min="36"
            max="120"
            value={item.fontSize}
            onChange={(event) => onChange(updatePosterSetting(item, "fontSize", Number(event.target.value)))}
          />
        </label>
        <label className="field">
          <span>Weight</span>
          <input
            type="number"
            min="300"
            max="900"
            step="100"
            value={item.fontWeight}
            onChange={(event) => onChange(updatePosterSetting(item, "fontWeight", Number(event.target.value)))}
          />
        </label>
      </div>

      <Segmented<TextColorMode>
        label="Text color"
        value={item.textColorMode}
        values={textColorModes}
        onChange={(value) => onChange(updatePosterSetting(item, "textColorMode", value))}
      />

      <div className="control-actions">
        <button className="button ghost full" type="button" onClick={onApplyAll}>Apply style to all</button>
        <button className="button danger full" type="button" onClick={onRemove}>Remove image</button>
      </div>
    </div>
  );
}

function Segmented<T extends string>({ label, value, values, onChange }: {
  label: string;
  value: T;
  values: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="segmented">
      <legend>{label}</legend>
      <div>
        {values.map((option) => (
          <button
            className={option === value ? "active" : ""}
            key={option}
            type="button"
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function downloadBlobUrl(url: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  window.setTimeout(() => anchor.remove(), 60_000);
}

function revokeDownloadUrl(url: string) {
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export poster."));
    }, type);
  });
}

async function openSaveFilePicker(fileName: string, mimeType: string, extensions: string[]) {
  const pickerWindow = window as Window & {
    showSaveFilePicker?: (options: {
      suggestedName: string;
      types: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<FileSystemFileHandle>;
  };

  if (typeof pickerWindow.showSaveFilePicker !== "function" || isTouchLikeDevice()) {
    return null;
  }

  try {
    return await pickerWindow.showSaveFilePicker({
      suggestedName: fileName,
      types: [{ description: fileName, accept: { [mimeType]: extensions } }],
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled" as const;
    }
    throw error;
  }
}

function isTouchLikeDevice() {
  return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
}

function canShareFile(file: File) {
  return typeof navigator.share === "function"
    && (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }));
}

async function writeBlobToFile(fileHandle: FileSystemFileHandle | "cancelled", blob: Blob) {
  if (fileHandle === "cancelled") return;
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export default App;
