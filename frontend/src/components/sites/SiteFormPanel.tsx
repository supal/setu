import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError, resolveFileUrl } from "../../api/client";
import { extractClientMetadata } from "../../lib/exif";
import { compressImage } from "../../lib/compressImage";
import type { ConstructionStatus, ImageMetadata, Site, SiteFile } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Spinner } from "../ui/Spinner";
import { SiteMap } from "./SiteMap";

type PanelMode = { type: "create" } | { type: "edit"; site: Site };

interface StagedFile {
  file: File;
  filename: string;
  mimeType: string;
  metadata: ImageMetadata;
  previewUrl: string | null;
}

interface PendingUpload {
  tempId: string;
  filename: string;
  previewUrl: string | null;
}

function isImageType(mimeType: string) {
  return mimeType.startsWith("image/");
}

async function uploadFile(siteId: string, file: File, metadata: ImageMetadata): Promise<SiteFile> {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("metadata", JSON.stringify(metadata));
  const res = await api.postForm<{ file: SiteFile }>(`/api/sites/${siteId}/files`, formData);
  return res.file;
}

// Images get EXIF-extracted (for GPS auto-fill) and compressed to <100KB before upload; other
// file types (PDFs) aren't images — neither operation applies, so they upload as-is.
async function prepareFile(original: File) {
  if (!isImageType(original.type)) {
    return { file: original, metadata: {} as ImageMetadata, previewUrl: null as string | null };
  }
  const metadata = await extractClientMetadata(original);
  const compressed = await compressImage(original);
  return { file: compressed, metadata, previewUrl: URL.createObjectURL(compressed) };
}

export function SiteFormPanel({
  mode,
  canManage,
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
  canManage: boolean;
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
  const propSite = mode.type === "edit" ? mode.site : null;

  const [name, setName] = useState(propSite?.name ?? "");
  const [address, setAddress] = useState(propSite?.address ?? "");
  const [status, setStatus] = useState<ConstructionStatus>(propSite?.constructionStatus ?? "planned");

  // Set once a site is created mid-session (create mode → some/all staged files uploaded);
  // from then on this panel behaves like it's editing that site, even though `mode` prop is
  // still "create". Lets a partial upload failure keep the panel open for retry instead of
  // silently losing track of it.
  const [createdSite, setCreatedSite] = useState<Site | null>(null);
  const activeSite = createdSite ?? propSite;

  const [files, setFiles] = useState<SiteFile[]>(propSite?.files ?? []);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingSite, setDeletingSite] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stagedFilesRef = useRef(stagedFiles);
  stagedFilesRef.current = stagedFiles;
  useEffect(
    () => () => stagedFilesRef.current.forEach((s) => s.previewUrl && URL.revokeObjectURL(s.previewUrl)),
    []
  );

  async function handleAddFiles(selected: FileList | File[]) {
    if (!canManage) return;
    for (const original of Array.from(selected)) {
      const { file, metadata, previewUrl } = await prepareFile(original);
      if (metadata.gps && !latitude && !longitude) {
        onLatLngChange(metadata.gps.latitude, metadata.gps.longitude);
      }

      if (activeSite) {
        const tempId = crypto.randomUUID();
        setPendingUploads((prev) => [...prev, { tempId, filename: original.name, previewUrl }]);
        try {
          const uploaded = await uploadFile(activeSite.id, file, metadata);
          setFiles((prev) => [uploaded, ...prev]);
        } catch (err) {
          setError(err instanceof ApiError ? err.message : `Failed to upload ${original.name}`);
        } finally {
          setPendingUploads((prev) => prev.filter((p) => p.tempId !== tempId));
          if (previewUrl) URL.revokeObjectURL(previewUrl);
        }
      } else {
        setStagedFiles((prev) => [
          ...prev,
          { file, filename: original.name, mimeType: file.type, metadata, previewUrl },
        ]);
      }
    }
  }

  function removeStagedFile(index: number) {
    setStagedFiles((prev) => {
      if (prev[index].previewUrl) URL.revokeObjectURL(prev[index].previewUrl!);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleDeleteFile(file: SiteFile) {
    if (!activeSite || !canManage) return;
    setDeletingFileId(file.id);
    try {
      await api.delete(`/api/sites/${activeSite.id}/files/${file.id}`);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete file");
    } finally {
      setDeletingFileId(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleAddFiles(e.dataTransfer.files);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        name,
        address: address || undefined,
        constructionStatus: status,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
      };

      if (activeSite) {
        const res = await api.put<{ site: Site }>(`/api/sites/${activeSite.id}`, body);
        onSaved(res.site);
        return;
      }

      const res = await api.post<{ site: Site }>("/api/sites", body);
      const site = res.site;
      setCreatedSite(site);

      const uploaded: SiteFile[] = [];
      let failedCount = 0;
      for (const staged of stagedFiles) {
        try {
          const uploadedFile = await uploadFile(site.id, staged.file, staged.metadata);
          uploaded.push(uploadedFile);
          setFiles((prev) => [...prev, uploadedFile]);
        } catch {
          failedCount++;
        }
        if (staged.previewUrl) URL.revokeObjectURL(staged.previewUrl);
      }
      setStagedFiles([]);

      if (failedCount > 0) {
        setError(
          `Site created, but ${failedCount} file${failedCount > 1 ? "s" : ""} failed to upload — add ${
            failedCount > 1 ? "them" : "it"
          } again below.`
        );
        return;
      }

      onSaved({ ...site, files: uploaded });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save site");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!activeSite || !canManage) return;
    if (!confirm(`Delete ${activeSite.name}? This cannot be undone.`)) return;
    setDeletingSite(true);
    try {
      await api.delete(`/api/sites/${activeSite.id}`);
      onDeleted(activeSite.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete site");
    } finally {
      setDeletingSite(false);
    }
  }

  function handleClose() {
    // The site may already exist in the DB (created mid-session) even if this panel never
    // reached a clean "all files uploaded" success — make sure the list/map reflect that
    // instead of silently dropping it when the user backs out.
    if (createdSite) onSaved({ ...createdSite, files });
    else onCancel();
  }

  const draftCoords = {
    latitude: latitude ? Number(latitude) : null,
    longitude: longitude ? Number(longitude) : null,
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <button type="button" onClick={handleClose} className="text-sm text-slate-500 hover:text-slate-700 md:hidden">
          ‹ Back
        </button>
        <h2 className="text-lg font-semibold text-slate-900">{activeSite ? "Edit Site" : "Add New Site"}</h2>
        <span className="w-10 md:hidden" />
      </div>

      {!canManage && (
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-slate-500">
          You can view this site, but only its owner or an admin can edit or delete it.
        </p>
      )}

      {(files.length > 0 || pendingUploads.length > 0 || stagedFiles.length > 0) && (
        <div className="grid grid-cols-4 gap-2">
          {files.map((f) => (
            <FileThumb
              key={f.id}
              url={resolveFileUrl(f.url)}
              filename={f.filename}
              mimeType={f.mimeType}
              isCover={f.isCover}
              onDelete={canManage ? () => handleDeleteFile(f) : undefined}
              busy={deletingFileId === f.id}
            />
          ))}
          {pendingUploads.map((p) => (
            <FileThumb key={p.tempId} url={p.previewUrl} filename={p.filename} busy />
          ))}
          {stagedFiles.map((s, i) => (
            <FileThumb
              key={s.previewUrl ?? s.filename + i}
              url={s.previewUrl}
              filename={s.filename}
              mimeType={s.mimeType}
              onDelete={() => removeStagedFile(i)}
            />
          ))}
        </div>
      )}

      {canManage && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed p-3 text-center transition-colors ${
            isDragging ? "border-brand-500 bg-brand-50" : "border-border bg-surface-muted"
          }`}
        >
          <span className="text-xl">☁️</span>
          <p className="text-sm font-medium text-slate-700">Add photos or PDFs</p>
          <p className="text-xs text-slate-500">Photos compressed to under 100KB · GPS auto-extracted</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={(e) => {
              if (e.target.files?.length) handleAddFiles(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
          />
        </div>
      )}

      <Input
        id="site-name"
        label="Name"
        required
        disabled={!canManage}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        id="site-address"
        label="Address"
        disabled={!canManage}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <Select
        id="site-status"
        label="Status"
        disabled={!canManage}
        value={status}
        onChange={(e) => setStatus(e.target.value as ConstructionStatus)}
      >
        <option value="planned">Planned</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <CoordinateField
          label="Latitude"
          value={latitude}
          onChange={onLatitudeInput}
          min={-90}
          max={90}
          disabled={!canManage}
        />
        <CoordinateField
          label="Longitude"
          value={longitude}
          onChange={onLongitudeInput}
          min={-180}
          max={180}
          disabled={!canManage}
        />
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
        {activeSite && canManage ? (
          <Button type="button" variant="danger" onClick={handleDelete} disabled={deletingSite}>
            {deletingSite && <Spinner />}
            {deletingSite ? "Deleting…" : "Delete"}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {createdSite ? "Done" : "Cancel"}
          </Button>
          {canManage && (
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner />}
              {submitting ? "Saving…" : activeSite ? "Save changes" : "Create site"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

function FileThumb({
  url,
  filename,
  mimeType,
  isCover,
  onDelete,
  busy,
}: {
  url: string | null;
  filename: string;
  mimeType?: string;
  isCover?: boolean;
  onDelete?: () => void;
  busy?: boolean;
}) {
  const isImage = mimeType ? isImageType(mimeType) : !!url;

  const body = isImage && url ? (
    <img src={url} alt="" className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1 text-center">
      <span className="text-xl">📄</span>
      <span className="w-full truncate text-[10px] text-slate-500">{filename}</span>
    </div>
  );

  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg bg-surface-muted">
      {url && !isImage ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
          {body}
        </a>
      ) : (
        body
      )}
      {isCover && (
        <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] leading-4 text-white">
          Cover
        </span>
      )}
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
          <Spinner />
        </div>
      )}
      {onDelete && !busy && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Remove file"
        >
          ×
        </button>
      )}
    </div>
  );
}

function CoordinateField({
  label,
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  disabled?: boolean;
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
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Not set"
          className="w-full bg-transparent text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}
