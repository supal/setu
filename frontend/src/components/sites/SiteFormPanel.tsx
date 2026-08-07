import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError, resolveImageUrl } from "../../api/client";
import { extractClientMetadata } from "../../lib/exif";
import { isTusUploadMode, uploadSiteImage } from "../../lib/upload";
import type { ConstructionStatus, ImageMetadata, Site } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { SiteMap } from "./SiteMap";

type PanelMode = { type: "create" } | { type: "edit"; site: Site };

export function SiteFormPanel({
  mode,
  latitude,
  longitude,
  onLatLngChange,
  onLatitudeInput,
  onLongitudeInput,
  contextSites,
  onSaved,
  onDeleted,
  onCancel,
}: {
  mode: PanelMode;
  latitude: string;
  longitude: string;
  onLatLngChange: (lat: number, lng: number) => void;
  onLatitudeInput: (value: string) => void;
  onLongitudeInput: (value: string) => void;
  contextSites: Site[];
  onSaved: (site: Site) => void;
  onDeleted: (id: string) => void;
  onCancel: () => void;
}) {
  const editingSite = mode.type === "edit" ? mode.site : null;

  const [name, setName] = useState(editingSite?.name ?? "");
  const [address, setAddress] = useState(editingSite?.address ?? "");
  const [status, setStatus] = useState<ConstructionStatus>(editingSite?.constructionStatus ?? "planned");
  const [file, setFile] = useState<File | null>(null);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(
    editingSite?.imageUrl ? resolveImageUrl(editingSite.imageUrl) : null
  );

  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  async function handleFile(selected: File | null) {
    setFile(selected);
    setImageMetadata(null);
    if (!selected) return;

    const meta = await extractClientMetadata(selected);
    setImageMetadata(meta);
    if (meta.gps && !latitude && !longitude) {
      onLatLngChange(meta.gps.latitude, meta.gps.longitude);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const isEdit = mode.type === "edit";
      const url = isEdit ? `/api/sites/${mode.site.id}` : "/api/sites";

      let site: Site;
      if (isTusUploadMode) {
        let imageUrl: string | undefined;
        if (file) {
          setUploadProgress(0);
          imageUrl = await uploadSiteImage(file, setUploadProgress);
          setUploadProgress(100);
        }
        const body = {
          name,
          address: address || undefined,
          constructionStatus: status,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          ...(imageUrl ? { imageUrl, imageMetadata } : {}),
        };
        const res = isEdit
          ? await api.put<{ site: Site }>(url, body)
          : await api.post<{ site: Site }>(url, body);
        site = res.site;
      } else {
        const formData = new FormData();
        formData.set("name", name);
        if (address) formData.set("address", address);
        formData.set("constructionStatus", status);
        if (latitude) formData.set("latitude", latitude);
        if (longitude) formData.set("longitude", longitude);
        if (file) formData.set("image", file);
        if (imageMetadata) formData.set("imageMetadata", JSON.stringify(imageMetadata));

        const res = isEdit
          ? await api.putForm<{ site: Site }>(url, formData)
          : await api.postForm<{ site: Site }>(url, formData);
        site = res.site;
      }
      onSaved(site);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save site");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!editingSite) return;
    if (!confirm(`Delete ${editingSite.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/sites/${editingSite.id}`);
      onDeleted(editingSite.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete site");
    }
  }

  const draftCoords = {
    latitude: latitude ? Number(latitude) : null,
    longitude: longitude ? Number(longitude) : null,
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-slate-500 hover:text-slate-700 md:hidden"
        >
          ‹ Back
        </button>
        <h2 className="text-lg font-semibold text-slate-900">{editingSite ? "Edit Site" : "Add New Site"}</h2>
        <span className="w-10 md:hidden" />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          isDragging ? "border-brand-500 bg-brand-50" : "border-border bg-surface-muted"
        }`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="h-24 w-24 rounded-lg object-cover" />
        ) : (
          <span className="text-2xl">☁️</span>
        )}
        <p className="text-sm font-medium text-slate-700">Drag Photo · Resumable Upload</p>
        <p className="text-xs text-slate-500">(Auto-extract GPS) — or click to choose a file</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        {uploadProgress != null && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      <Input id="site-name" label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Input id="site-address" label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
      <Select
        id="site-status"
        label="Status"
        value={status}
        onChange={(e) => setStatus(e.target.value as ConstructionStatus)}
      >
        <option value="planned">Planned</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <CoordinateField label="Latitude" value={latitude} onChange={onLatitudeInput} min={-90} max={90} />
        <CoordinateField label="Longitude" value={longitude} onChange={onLongitudeInput} min={-180} max={180} />
      </div>

      {latitude && longitude && (
        <a
          href={`https://www.google.com/maps?q=${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="-mt-2 self-start text-xs font-medium text-brand-600 hover:underline"
        >
          Open in Google Map ↗
        </a>
      )}

      <p className="-mt-2 text-xs text-slate-500">Click the map to set or adjust the location.</p>

      <div className="h-48 md:hidden">
        <SiteMap sites={contextSites} draft={draftCoords} onPlaceDraft={onLatLngChange} compact />
      </div>

      {error && <p className="text-sm text-status-danger-text">{error}</p>}

      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        {editingSite ? (
          <Button type="button" variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : editingSite ? "Save changes" : "Create site"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function CoordinateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`site-${label.toLowerCase()}`} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-slate-600 focus-within:border-brand-500 focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand-100">
        <span>📍</span>
        <input
          id={`site-${label.toLowerCase()}`}
          type="number"
          step="any"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Not set"
          className="w-full bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}
