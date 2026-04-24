"use client";

import { useState, useRef, useCallback } from "react";
import { Badge, Button, Alert, Spinner } from "@saas-shop/ui";
import type { MediaAsset } from "./page";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

function mimeEmoji(mime: string): string {
  if (mime.startsWith("image/svg")) return "🖼️";
  if (mime.startsWith("image/gif")) return "🎞️";
  if (mime.startsWith("image/png")) return "🖼️";
  if (mime.startsWith("image/jpeg")) return "📷";
  if (mime.startsWith("image/webp")) return "🌐";
  if (mime.startsWith("image/avif")) return "🌐";
  if (mime.startsWith("video/")) return "🎬";
  return "📁";
}

function statusVariant(
  status: MediaAsset["status"]
): "success" | "warning" | "danger" {
  switch (status) {
    case "ready":
      return "success";
    case "pending":
      return "warning";
    case "failed":
      return "danger";
  }
}

const STATUS_LABELS: Record<MediaAsset["status"], string> = {
  ready: "Klar",
  pending: "Väntar",
  failed: "Misslyckad",
};

// ── Edit drawer ───────────────────────────────────────────────────────────────

interface EditDrawerProps {
  asset: MediaAsset;
  onSave: (updated: MediaAsset) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function EditDrawer({ asset, onSave, onDelete, onClose }: EditDrawerProps) {
  const [altText, setAltText] = useState(asset.altText ?? "");
  const [title, setTitle] = useState(asset.title ?? "");
  const [caption, setCaption] = useState(asset.caption ?? "");
  const [folder, setFolder] = useState(asset.folder ?? "");
  const [tags, setTags] = useState(asset.tags.join(", "));
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!altText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/media/${asset.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          altText: altText.trim(),
          title: title.trim() || null,
          caption: caption.trim() || null,
          folder: folder.trim() || null,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const updated = (await res.json()) as MediaAsset;
      onSave(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid sparande");
    } finally {
      setSaving(false);
    }
  }

  async function handleProcess() {
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/media/${asset.id}/process`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid bearbetning");
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Ta bort "${asset.filename}"?`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/media/${asset.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}`);
      onDelete(asset.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid borttagning");
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-900">Redigera media</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              Filnamn
            </label>
            <p className="text-sm text-zinc-500 font-mono">{asset.filename}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              Alt-text <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 ${
                !altText.trim() ? "border-red-400" : "border-zinc-300"
              }`}
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Beskriv bildens innehåll…"
            />
            {!altText.trim() && (
              <p className="text-xs text-red-500 mt-0.5">Alt-text krävs för tillgänglighet.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Titel</label>
            <input
              className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Bildtext</label>
            <textarea
              className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Mapp</label>
            <input
              className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="t.ex. produkter/sommaren"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              Taggar (kommaseparerade)
            </label>
            <input
              className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="t.ex. hero, kampanj"
            />
          </div>

          {asset.variants.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-2">Varianter</label>
              <div className="space-y-1">
                {asset.variants.map((v, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 font-mono uppercase">{v.format}</span>
                    <span className="text-zinc-400">
                      {v.width}×{v.height}
                    </span>
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Öppna
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !altText.trim()}
          >
            {saving ? "Sparar…" : "Spara"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleProcess}
            disabled={processing}
          >
            {processing ? "Bearbetar…" : "Bearbeta bild"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            {deleting ? "Tar bort…" : "Ta bort"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Upload zone ───────────────────────────────────────────────────────────────

interface UploadZoneProps {
  onUploaded: (asset: MediaAsset) => void;
}

function UploadZone({ onUploaded }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Endast bildfiler är tillåtna.");
        return;
      }
      setUploading(true);
      setProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      try {
        // Use XMLHttpRequest to get progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          });
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const asset = JSON.parse(xhr.responseText) as MediaAsset;
                onUploaded(asset);
                resolve();
              } catch {
                reject(new Error("Ogiltigt svar från servern"));
              }
            } else {
              reject(new Error(`${xhr.status}`));
            }
          });
          xhr.addEventListener("error", () => reject(new Error("Nätverksfel")));
          xhr.open("POST", `${API}/api/media/upload`);
          xhr.withCredentials = true;
          xhr.send(formData);
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Uppladdningsfel");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [onUploaded]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  }

  return (
    <div>
      {error && (
        <div className="mb-2">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-zinc-500 bg-zinc-100"
            : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {uploading ? (
          <div className="space-y-2">
            <Spinner />
            <div className="w-full bg-zinc-200 rounded-full h-1.5">
              <div
                className="bg-zinc-800 h-full rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">Laddar upp… {progress}%</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-2xl">📁</p>
            <p className="text-sm text-zinc-600">
              Dra & släpp en bild här, eller{" "}
              <span className="text-zinc-900 font-medium underline">klicka för att välja</span>
            </p>
            <p className="text-xs text-zinc-400">Endast bilder (image/*)</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Media card ────────────────────────────────────────────────────────────────

function MediaCard({
  asset,
  onClick,
}: {
  asset: MediaAsset;
  onClick: () => void;
}) {
  const missingAlt = !asset.altText?.trim();

  return (
    <button
      onClick={onClick}
      className="group relative bg-white border border-zinc-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow text-left w-full"
    >
      {/* Image area */}
      <div className="aspect-square bg-zinc-100 flex items-center justify-center text-4xl relative">
        <span>{mimeEmoji(asset.mimeType)}</span>
        {missingAlt && (
          <div
            title="Alt-text saknas — krävs för tillgänglighet"
            className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full"
          />
        )}
      </div>
      {/* Info */}
      <div className="p-2 space-y-1">
        <p className="text-xs font-medium text-zinc-800 truncate">{asset.filename}</p>
        <div className="flex items-center justify-between">
          <Badge variant={statusVariant(asset.status)}>
            {STATUS_LABELS[asset.status]}
          </Badge>
          {asset.width && asset.height && (
            <span className="text-xs text-zinc-400">
              {asset.width}×{asset.height}
            </span>
          )}
        </div>
        {asset.altText && (
          <p className="text-xs text-zinc-400 truncate">{asset.altText}</p>
        )}
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type StatusFilter = "all" | MediaAsset["status"];

interface MediaClientProps {
  initialAssets: MediaAsset[];
}

export function MediaClient({ initialAssets }: MediaClientProps) {
  const [assets, setAssets] = useState<MediaAsset[]>(initialAssets);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [folderFilter, setFolderFilter] = useState("");
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const STATUS_TABS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Alla" },
    { key: "ready", label: "Klara" },
    { key: "pending", label: "Väntar" },
    { key: "failed", label: "Misslyckade" },
  ];

  const folders = [
    ...new Set(
      assets.map((a) => a.folder).filter((f): f is string => f !== null)
    ),
  ].sort();

  const filtered = assets.filter((a) => {
    const matchSearch =
      !search || a.filename.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchFolder = !folderFilter || a.folder === folderFilter;
    return matchSearch && matchStatus && matchFolder;
  });

  function updateAsset(updated: MediaAsset) {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setEditingAsset(updated);
  }

  function removeAsset(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setEditingAsset(null);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mediabibliotek</h1>
          <p className="text-zinc-500 mt-1">{assets.length} filer totalt.</p>
        </div>
        <Button onClick={() => setShowUpload((v) => !v)}>
          {showUpload ? "Stäng uppladdning" : "Ladda upp"}
        </Button>
      </div>

      {/* Upload zone */}
      {showUpload && (
        <div className="mb-6">
          <UploadZone
            onUploaded={(asset) => {
              setAssets((prev) => [asset, ...prev]);
              setShowUpload(false);
            }}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="border border-zinc-300 rounded-md px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          placeholder="Sök filnamn…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                statusFilter === t.key
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {folders.length > 0 && (
          <select
            className="border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={folderFilter}
            onChange={(e) => setFolderFilter(e.target.value)}
          >
            <option value="">Alla mappar</option>
            {folders.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-4xl mb-3">📭</p>
          <p>Inga mediafiler hittades.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((asset) => (
            <MediaCard
              key={asset.id}
              asset={asset}
              onClick={() => setEditingAsset(asset)}
            />
          ))}
        </div>
      )}

      {editingAsset && (
        <EditDrawer
          asset={editingAsset}
          onSave={updateAsset}
          onDelete={removeAsset}
          onClose={() => setEditingAsset(null)}
        />
      )}
    </div>
  );
}
