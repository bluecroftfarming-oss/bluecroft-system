# Bluecroft Farming — Crab Inventory Control System
#
# Single-stage-ish build on a glibc (not alpine) base so better-sqlite3's
# prebuilt native binding resolves without needing a C++ toolchain.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
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
COPY --from=builder /app/data/legacy ./data/legacy
COPY --from=builder /app/data/seed ./data/seed
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# The live SQLite file lives on a persistent volume mounted at /app/data —
# attach one at this path in your host's dashboard (Railway/Render/Fly all
# support this), otherwise every redeploy resets to the seed data.
VOLUME ["/app/data"]
EXPOSE 3000
ENV PORT=3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
