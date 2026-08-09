// An allowlist, not a denylist — keep in sync with backend/src/lib/allowedFileTypes.ts.
// SVG and HTML are deliberately excluded even though they're "just files" in name, since a
// browser will execute embedded <script> in them when opened directly via the public URL
// these end up behind.
export const ALLOWED_FILE_MIME_TYPES = [
  // Images (SVG intentionally excluded)
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
] as const;

export const ALLOWED_FILE_ACCEPT = ALLOWED_FILE_MIME_TYPES.join(",");
