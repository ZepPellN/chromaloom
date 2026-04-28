import { Download, FileArchive, ImagePlus, RotateCcw, SlidersHorizontal, Sparkles, Type, Upload } from "lucide-react";
import JSZip from "jszip";
import { useEffect, useMemo, useRef, useState } from "react";
import { readableTextColor } from "./lib/color";
import { extractThemeColorsFromImage, fileToImage, loadImageElement } from "./lib/image";
import { renderPoster } from "./lib/renderPoster";
import {
  DEFAULT_FONT,
  MAX_BATCH,
  applyStyleFrom,
  createPosterItem,
  fieldModes,
  fitModes,
  layoutModes,
  sanitizeFileName,
  textColorModes,
  updatePosterSetting,
} from "./lib/posterState";
import type { FieldMode, FitMode, LayoutMode, LoadedImage, PosterItem, TextColorMode } from "./types";

const FONT_OPTIONS = [
  { label: "Songti", value: DEFAULT_FONT },
  { label: "Kaiti", value: `"Kaiti SC", "STKaiti", "KaiTi", serif` },
  { label: "PingFang", value: `"PingFang SC", "Hiragino Sans GB", sans-serif` },
  { label: "Serif", value: `Georgia, "Times New Roman", serif` },
];

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

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;

    const remaining = MAX_BATCH - items.length;
    if (remaining <= 0) {
      setStatus(`Batch limit reached. Keep it to ${MAX_BATCH} images for a fast local workflow.`);
      return;
    }

    setIsProcessing(true);
    const nextItems: PosterItem[] = [];
    const nextImages: Record<string, LoadedImage> = {};

    try {
      for (const file of Array.from(files).slice(0, remaining)) {
        if (!file.type.startsWith("image/")) continue;
        const loaded = await fileToImage(file);
        const palette = extractThemeColorsFromImage(loaded.element);
        const item = createPosterItem({
          id: crypto.randomUUID(),
          fileName: file.name,
          imageUrl: loaded.url,
          naturalWidth: loaded.width,
          naturalHeight: loaded.height,
          palette,
        });
        nextItems.push(item);
        nextImages[item.id] = loaded;
      }

      setItems((current) => [...current, ...nextItems]);
      setLoadedImages((current) => ({ ...current, ...nextImages }));
      if (nextItems[0]) setSelectedId(nextItems[0].id);
      setStatus(nextItems.length > 0 ? `Processed ${nextItems.length} image${nextItems.length > 1 ? "s" : ""}.` : "No supported images found.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not process image.");
    } finally {
      setIsProcessing(false);
    }
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

  function exportSelected() {
    if (!selected) return;
    const image = loadedImages[selected.id];
    if (!image) {
      setExportStatus("Image is still loading. Try again in a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    renderPoster(canvas, selected, image);
    const url = canvas.toDataURL("image/png");
    const fileName = `${sanitizeFileName(selected.title || selected.fileName)}-poster.png`;
    if (readyDownload) revokeDownloadUrl(readyDownload.url);
    setReadyDownload({ url, fileName });
    downloadDataUrl(url, fileName);
    setExportStatus("PNG download started. If the browser prompt interrupted it, use the Ready link.");
  }

  async function exportAll() {
    if (!items.length) return;
    setExportStatus("Preparing zip...");
    if (readyDownload) revokeDownloadUrl(readyDownload.url);
    setReadyDownload(null);

    const zip = new JSZip();
    for (const item of items) {
      const blob = await renderToBlob(item, loadedImages[item.id]);
      zip.file(`${sanitizeFileName(item.title || item.fileName)}-${items.indexOf(item) + 1}.png`, blob);
    }
    const archive = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(archive);
    setReadyDownload({ url, fileName: "colorful-posters.zip" });
    setExportStatus("Zip is ready. Use the download link below.");
  }

  function applyCurrentStyleToAll() {
    if (!selected) return;
    setItems((current) => current.map((item) => (item.id === selected.id ? item : applyStyleFrom(selected, item))));
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
      <section className="masthead" aria-label="Colorful overview">
        <div>
          <p className="eyebrow">Local color poster studio</p>
          <h1>Colorful</h1>
        </div>
        <div className="masthead-actions">
          <label className="button primary">
            <Upload size={18} aria-hidden="true" />
            <span>Upload</span>
            <input type="file" accept="image/*" multiple onChange={(event) => void handleFiles(event.target.files)} />
          </label>
          <button className="button" type="button" onClick={() => void exportSelected()} disabled={!selected}>
            <Download size={18} aria-hidden="true" />
            <span>PNG</span>
          </button>
          <button className="button" type="button" onClick={() => void exportAll()} disabled={items.length === 0}>
            <FileArchive size={18} aria-hidden="true" />
            <span>Zip</span>
          </button>
          {readyDownload ? (
            <a
              className="button primary"
              href={readyDownload.url}
              download={readyDownload.fileName}
              onClick={() => {
                window.setTimeout(() => {
                  revokeDownloadUrl(readyDownload.url);
                  setReadyDownload(null);
                }, 5_000);
              }}
            >
              <Download size={18} aria-hidden="true" />
              <span>Ready</span>
            </a>
          ) : null}
        </div>
      </section>
      {exportStatus ? <p className="export-status" role="status">{exportStatus}</p> : null}

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
              <ImagePlus size={42} aria-hidden="true" />
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
  onFiles: (files: FileList | null) => Promise<void>;
}) {
  return (
    <div className="drop-zone">
      <Sparkles size={18} aria-hidden="true" />
      <h2>Images</h2>
      <p>{status}</p>
      <label className="button ghost full">
        <ImagePlus size={17} aria-hidden="true" />
        <span>{isProcessing ? "Reading colors" : count ? "Add more" : "Choose images"}</span>
        <input type="file" accept="image/*" multiple onChange={(event) => void onFiles(event.target.files)} />
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
        <span>{item.layoutMode === "auto" ? "Auto ratio" : item.layoutMode}</span>
        <span>{item.fitMode}</span>
        <span>{item.naturalWidth}x{item.naturalHeight}</span>
      </div>
    </div>
  );
}

function Controls({ item, onChange, onRemove, onApplyAll }: {
  item: PosterItem;
  onChange: (item: PosterItem) => void;
  onRemove: () => void;
  onApplyAll: () => void;
}) {
  return (
    <div className="controls">
      <div className="control-title">
        <SlidersHorizontal size={18} aria-hidden="true" />
        <h2>Adjust</h2>
      </div>

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
        label="Ratio"
        value={item.layoutMode}
        values={layoutModes}
        onChange={(value) => onChange(updatePosterSetting(item, "layoutMode", value))}
      />

      <Segmented<FieldMode>
        label="Color field"
        value={item.fieldMode}
        values={fieldModes}
        onChange={(value) => onChange(updatePosterSetting(item, "fieldMode", value))}
      />

      <Segmented<FitMode>
        label="Image fit"
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
            <RotateCcw size={16} aria-hidden="true" />
            Reset crop
          </button>
        </div>
      ) : null}

      <div className="control-title small">
        <Type size={17} aria-hidden="true" />
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

function downloadDataUrl(url: string, fileName: string) {
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

export default App;
