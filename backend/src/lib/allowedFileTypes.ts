// An allowlist, not a denylist — anything not explicitly listed here is rejected. Deliberately
// excludes types that are "just a file" in name only but get executed/rendered by a browser
// when opened via the public URL these end up behind: SVG and HTML can embed <script>, and
// executables/shell scripts have no business being "site documents". Keep in sync with
// frontend/src/lib/allowedFileTypes.ts.
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
