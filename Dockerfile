# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/marketing/package.json ./apps/marketing/
COPY apps/storefront/package.json ./apps/storefront/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Stage 2: build API ────────────────────────────────────────────────────────
FROM node:20-alpine AS api-build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/admin/node_modules ./apps/admin/node_modules
COPY --from=deps /app/apps/marketing/node_modules ./apps/marketing/node_modules
COPY --from=deps /app/apps/storefront/node_modules ./apps/storefront/node_modules
COPY . .

RUN pnpm --filter @saas-shop/api build

# ── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS api
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/marketing/package.json ./apps/marketing/
COPY apps/storefront/package.json ./apps/storefront/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=api-build /app/dist ./dist
COPY --from=api-build /app/src/db ./src/db

EXPOSE 3000

CMD ["node", "dist/server.js"]
