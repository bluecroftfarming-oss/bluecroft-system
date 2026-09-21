# Bluecroft Farming — Crab Inventory Control System

A dashboard, data-entry, and inventory system for Bluecroft's soft-shell crab
hardening/molting operation. Built with Next.js (App Router), Drizzle ORM,
and SQLite (better-sqlite3).

- **Dashboard** — live inventory by grade, a period filter (Today/This
  Week/Last Week/This Month/Last Month) over Mortality/Return/Sales/Missing,
  and Output %/Hard %/Mortality % gauges.
- **Inventory** — every field from the original tracking sheet, with an
  Add/Edit crab intake form.
- **Vendors** — per-vendor volume and outcome rates, with a merge tool for
  likely-duplicate vendor names carried over from the legacy sheet.
- **System Boxes** — live occupancy across all hardening boxes.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. The live database is `data/bluecroft.db`
(SQLite, WAL mode) — it already contains the migrated legacy data (2,169
crabs, 43 vendors, 193 boxes). `data/seed/bluecroft.seed.db` is a checked-in
read-only snapshot of that same migrated data, used to seed a fresh
deployment (see below) — don't edit it directly.

## Deploying to a public URL

This is a stateful full-stack app (SQLite file, not just static pages), so it
needs a host with **persistent disk**, not a static/serverless platform like
plain Vercel. The included `Dockerfile` works on any host that can build and
run a Docker image with an attached volume. **Railway** is the simplest fit
(GitHub-connected auto-deploy, one-click persistent volumes, free trial
credit); Render and Fly.io work the same way.

### 1. Push this repo to GitHub

```bash
git remote add origin <your-empty-repo-url>
git push -u origin main
```

### 2. Deploy on Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from
   GitHub repo** → pick this repo. Railway auto-detects the `Dockerfile`.
2. Once it's created, open the service → **Settings → Volumes** → **Attach
   Volume**, mount path `/app/data`. This is the step that makes data
   survive redeploys — without it, every deploy resets to the seed data.
3. Under **Settings → Networking**, click **Generate Domain** to get a
   public `*.up.railway.app` URL.
4. Deploy. First boot seeds `/app/data` from the 2,169-crab migrated
   snapshot automatically (see `docker-entrypoint.sh`); every boot after
   that reuses whatever is already on the volume.

### Render / Fly.io

Same shape: connect the repo (or `flyctl launch` for Fly), attach a
persistent disk mounted at `/app/data`, deploy from the Dockerfile. On
Render, add a **Disk** under the service's settings with mount path
`/app/data`; on Fly, `fly volumes create` + mount it in `fly.toml` at
`/app/data`.

### Notes

- The container listens on `$PORT` (defaults to 3000) — Railway/Render/Fly
  all set this automatically.
- `better-sqlite3` is a native module; the Dockerfile uses a glibc
  (`node:22-bookworm-slim`) base so its prebuilt binding resolves without
  needing a C++ toolchain in the image.
- To reset a deployment back to the original migrated data, delete the
  volume (or the `bluecroft.db` file on it) and redeploy — the entrypoint
  will reseed it.
