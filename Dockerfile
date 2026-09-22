# Bluecroft Farming — Crab Inventory Control System
#
# Single-stage-ish build on a glibc (not alpine) base so better-sqlite3's
# native binding can be built or resolved without extra runtime dependencies.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# better-sqlite3 falls back to compiling from source (node-gyp) whenever a
# matching prebuilt binary isn't available, so make sure a C++ toolchain and
# Python are present — the slim base doesn't include them by default.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/data/seed ./seed
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# The live SQLite file lives on a persistent volume mounted at /app/data —
# attach one at this path in your host's dashboard (Railway/Render/Fly all
# support this), otherwise every redeploy resets to the seed data.
# (No Docker VOLUME instruction here: some hosts, e.g. Railway, reject it at
# build time and require the volume to be configured entirely in their own
# dashboard instead.)
EXPOSE 3000
ENV PORT=3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
