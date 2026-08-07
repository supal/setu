import * as tus from "tus-js-client";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const UPLOAD_MODE = import.meta.env.VITE_UPLOAD_MODE ?? "local";

export const isTusUploadMode = UPLOAD_MODE === "tus";

/**
 * Uploads a file in chunks directly to the backend's tus endpoint (backed by Supabase Storage),
 * resolving to the finished object's public URL. Only used when VITE_UPLOAD_MODE=tus — in
 * "local" mode the raw File is attached to the site form instead and this isn't called.
 */
export function uploadSiteImage(file: File, onProgress?: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${API_URL}/api/uploads`,
      chunkSize: 8 * 1024 * 1024,
      retryDelays: [0, 1000, 3000, 5000],
      metadata: { filename: file.name, filetype: file.type },
      onBeforeRequest: (req) => {
        const xhr = req.getUnderlyingObject();
        if (xhr instanceof XMLHttpRequest) xhr.withCredentials = true;
      },
      onProgress: (bytesSent, bytesTotal) => {
        onProgress?.(Math.round((bytesSent / bytesTotal) * 100));
      },
      onError: reject,
      onSuccess: (payload) => {
        const publicUrl = payload.lastResponse.getHeader("X-Image-Public-Url");
        if (!publicUrl) {
          reject(new Error("Upload finished without a public URL"));
          return;
        }
        resolve(publicUrl);
      },
    });

    upload.start();
  });
}
