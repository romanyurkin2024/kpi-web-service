FROM node:20 AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN pnpm install --frozen-lockfile --shamefully-hoist

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN cd apps/api && npx prisma generate
RUN cd apps/api && npx nest build
RUN find /app -name "libquery_engine*" -o -name "schema-engine*" 2>/dev/null | head -20

FROM node:20 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN pnpm install --frozen-lockfile --prod --shamefully-hoist
ENV NODE_TLS_REJECT_UNAUTHORIZED=1
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
EXPOSE 3000
CMD ["node", "apps/api/dist/main"]
