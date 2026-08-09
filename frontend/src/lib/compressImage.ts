const MAX_BYTES = 100 * 1024;
const MAX_ATTEMPTS = 8;
// A cover/thumbnail image never needs to be bigger than this. Capping it before the
// compress loop starts — rather than starting at the original resolution — avoids
// repeatedly drawing/encoding a full-size canvas (a 12MP+ phone photo can be 4000px+ on a
// side), which is what was hanging/crashing mobile browsers on attach.
const MAX_DIMENSION = 1600;

/** Re-encodes an image client-side, reducing quality then dimensions until it's under 100KB. */
export async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  let quality = 0.9;
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(bitmap, 0, 0, width, height);

    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size <= MAX_BYTES) break;

    if (quality > 0.5) {
      quality -= 0.15;
    } else {
      width = Math.round(width * 0.75);
      height = Math.round(height * 0.75);
    }
  }

  bitmap.close();

  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}
