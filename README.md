# SiteTracker

A responsive web app with a Node.js/Express backend, Postgres database (via Prisma), and a React frontend. Ships with admin/user roles, permission-based access control, cookie-based session auth, email notifications, Sites CRUD with photo upload + EXIF/GPS extraction, and an audit log.

## Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Postgres, JWT (httpOnly cookie), Resend (email)
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, React Router
- **Deploy targets**: Netlify (frontend), Render (backend), Supabase (managed Postgres)

## Project layout

```
backend/    Express API + Prisma schema
frontend/   React app
docker-compose.yml   Local Postgres for development
```

## Local development

### 1. Start a local Postgres

```
docker compose up -d
```

This starts Postgres on `localhost:5432` with database `sitetracker` (see `docker-compose.yml` for credentials). You can use your own local Postgres instead — just point `DATABASE_URL` at it.

### 2. Backend

```
cd backend
cp .env.example .env      # edit if needed — defaults match docker-compose
npm install
npm run prisma:migrate    # creates tables
npm run seed               # creates an admin user (admin@sitetracker.local / ChangeMe123!)
npm run dev                 # starts the API on http://localhost:4000
```

Without a `RESEND_API_KEY` set, outgoing emails (invite / reset / password-changed) are logged to the console instead of sent — handy for local testing of the password flows without a real email account.

### 3. Frontend

```
cd frontend
cp .env.example .env.local   # VITE_API_URL defaults to http://localhost:4000
npm install
npm run dev                   # starts the app on http://localhost:5173
```

Log in with the seeded admin account, then use **Users → Add New User** to invite others — check the backend console for the invite link if you haven't configured Resend yet.

## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (local or Supabase) |
| `JWT_SECRET` | Signs session JWTs — generate with `openssl rand -base64 48` |
| `COOKIE_MAX_AGE_DAYS` | How long a login session lasts before requiring re-login (default 7) |
| `RESEND_API_KEY` | Resend API key; omit locally to log emails to console instead |
| `EMAIL_FROM` | From address for outgoing emails |
| `FRONTEND_URL` | The frontend's origin — used for CORS and links in emails |
| `PORT` | API port (default 4000) |
| `STORAGE_DRIVER` | `local` (default, writes to `backend/uploads`, served over a single request) or `supabase` (Supabase Storage, uploaded directly from the browser via a resumable `tus` endpoint — required in production, see below) |
| `SUPABASE_PROJECT_REF` / `SUPABASE_S3_ACCESS_KEY_ID` / `SUPABASE_S3_SECRET_ACCESS_KEY` / `SUPABASE_S3_REGION` / `SUPABASE_BUCKET` / `SUPABASE_PUBLIC_URL` | Only needed when `STORAGE_DRIVER=supabase` — Supabase dashboard → Project Settings → Storage → S3 Connection |

### Frontend (`frontend/.env.local`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |
| `VITE_UPLOAD_MODE` | `local` (default, single-request upload — pair with backend `STORAGE_DRIVER=local`) or `tus` (chunked resumable upload straight to Supabase Storage — pair with `STORAGE_DRIVER=supabase`) |

## Deploying for free

### Database — Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Project Settings → Database → Connection string**, copy the **URI** (use the "Transaction" pooler connection on port 6543 for serverless-friendly pooling).
3. You'll paste this into Render's `DATABASE_URL` env var below.

### Photo storage — Supabase Storage

1. In your Supabase project, go to **Storage** and create a bucket, e.g. named `site-photos`.
2. Make the bucket public (bucket **Settings → Public bucket**, or via the toggle when creating it). The public base URL is `https://<project-ref>.supabase.co/storage/v1/object/public/site-photos` — that's `SUPABASE_PUBLIC_URL`.
3. Go to **Project Settings → Storage → S3 Connection** and create an access key — gives you `SUPABASE_S3_ACCESS_KEY_ID` / `SUPABASE_S3_SECRET_ACCESS_KEY` and shows the `SUPABASE_S3_REGION` to use. Your `SUPABASE_PROJECT_REF` is the subdomain in your project's URL (`https://<project-ref>.supabase.co`).

### Backend — Render

1. Push this repo to GitHub.
2. In Render, create a new **Blueprint** from the repo — it will pick up `backend/render.yaml`. (Or create a Web Service manually with root directory `backend`, build command `npm ci && npm run build`, start command `npx prisma migrate deploy && npm start`.)
3. Set the env vars Render prompts for: `DATABASE_URL` (from Supabase), `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL` (your Netlify URL, set after step below), `SUPABASE_PROJECT_REF`, `SUPABASE_S3_ACCESS_KEY_ID`, `SUPABASE_S3_SECRET_ACCESS_KEY`, `SUPABASE_S3_REGION`, `SUPABASE_PUBLIC_URL`. `JWT_SECRET` auto-generates; `STORAGE_DRIVER` defaults to `supabase` in `render.yaml` since Render's free disks don't persist uploads across deploys.
4. Deploy. Note the resulting service URL (e.g. `https://sitetracker-backend.onrender.com`).

### Frontend — Netlify

1. In Netlify, create a new site from the same repo — it will pick up `netlify.toml` at the repo root (base directory `frontend`).
2. Set env vars: `VITE_API_URL` to your Render backend URL, and `VITE_UPLOAD_MODE=tus` (to match the backend's `STORAGE_DRIVER=supabase`).
3. Deploy. Note the resulting site URL (e.g. `https://sitetracker.netlify.app`).
4. Go back to Render and set `FRONTEND_URL` to this Netlify URL, then redeploy the backend (needed for CORS and for links in emails to point to the right place).

### Seeding a production admin

After the first deploy, run once (e.g. via Render's shell):

```
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='choose-a-strong-password' npm run seed
```

## Roles & permissions

Access control is centralized in `backend/src/lib/permissions.ts` (an action → allowed-roles map) rather than scattered role checks:

| Action | Admin | User |
|---|---|---|
| Manage users (create/view/update/delete) | ✅ | ❌ |
| View audit log | ✅ | ❌ |
| Add a site | ✅ | ✅ |
| View/edit/delete a site | ✅ (any site) | ✅ (own sites only) |
| Change own password | ✅ | ✅ |

An admin cannot delete or demote/deactivate their own account.

## Sites

Each site has a name, address, construction status (`planned` / `in_progress` / `completed`), coordinates, and an optional photo.

Photo handling happens client-side first: as soon as a photo is selected, the browser extracts its EXIF metadata (dimensions, camera, timestamp, GPS) using `exifr` — if the photo has embedded GPS and you haven't typed coordinates in yet, they're filled in immediately, before anything uploads. A small Leaflet map in the form lets you click or drag a pin to set/override the location when a photo has no GPS data (or no photo at all).

How the photo itself gets uploaded depends on `VITE_UPLOAD_MODE`:
- **`local`** (dev default): the file is sent to the backend in a single request and written to `backend/uploads/`.
- **`tus`** (production): the file is uploaded in chunks directly from the browser to a Supabase Storage bucket (via its S3-compatible API) using a resumable `tus` protocol endpoint (`@tus/server` + `@tus/s3-store`) at `/api/uploads` — a dropped connection resumes rather than restarting. The backend only ever sees the resulting metadata and public URL, never the file bytes.

## Audit log

Every Sites/Users create/update/delete, plus auth events (login success/failure, password changed, password reset requested/completed), are recorded in `audit_logs` with the acting user, IP, and user agent. Admins can review it under **Audit Log** in the sidebar.

## What's next

A full site-browsing Map View (plotting every site on one map) — shown in the reference design — is planned but not yet built; the Add/Edit Site form already has a single-site map picker, so it's a matter of adding a page that plots all sites at once.
