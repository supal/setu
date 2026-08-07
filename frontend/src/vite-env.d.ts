/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_UPLOAD_MODE?: "local" | "tus";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
