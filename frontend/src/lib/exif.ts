import exifr from "exifr";
import type { ImageMetadata } from "../types";

export async function extractClientMetadata(file: File): Promise<ImageMetadata> {
  // Each extraction is caught independently — a phone-camera photo's maker-note/vendor tags
  // can trip up the general tag parser even when the (separate, narrower) GPS parse would
  // have succeeded fine. Coupling them via a shared try/catch meant one failure silently
  // discarded the other's already-successful result.
  const [tags, gps] = await Promise.all([
    exifr.parse(file, { pick: ["ExifImageWidth", "ExifImageHeight", "Make", "Model", "DateTimeOriginal"] }).catch(() => null),
    exifr.gps(file).catch(() => null),
  ]);

  const camera = [tags?.Make, tags?.Model].filter(Boolean).join(" ").trim() || undefined;

  return {
    width: tags?.ExifImageWidth,
    height: tags?.ExifImageHeight,
    camera,
    takenAt: tags?.DateTimeOriginal ? new Date(tags.DateTimeOriginal).toISOString() : undefined,
    gps: gps ? { latitude: gps.latitude, longitude: gps.longitude } : null,
  };
}
