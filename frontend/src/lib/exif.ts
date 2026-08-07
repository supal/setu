import exifr from "exifr";
import type { ImageMetadata } from "../types";

export async function extractClientMetadata(file: File): Promise<ImageMetadata> {
  try {
    const [tags, gps] = await Promise.all([
      exifr.parse(file, { pick: ["ExifImageWidth", "ExifImageHeight", "Make", "Model", "DateTimeOriginal"] }),
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
  } catch {
    // Not every image has (or needs) EXIF data — absence isn't an error.
    return {};
  }
}
