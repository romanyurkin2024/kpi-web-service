# KPI Platform

Fullstack monorepo — NestJS + Next.js + PostgreSQL.

## Stack

- **Backend:** NestJS + TypeScript
- **Primary DB:** PostgreSQL + Prisma
- **Frontend:** Next.js (App Router) + Radix Themes
- **Infra:** Docker / Docker Compose
- **Package manager:** pnpm workspaces

## Structure

\`\`\`
apps/
  api/        # NestJS backend
  web/        # Next.js frontend
packages/
  shared/     # shared types and DTOs
  config/     # shared config schemas
\`\`\`

## Quick Start

### 1. Install dependencies

\`\`\`bash
pnpm install
\`\`\`

### 2. Configure environment

\`\`\`bash
cp .env.example .env
# Edit .env with your values
\`\`\`

### 3. Start infrastructure

\`\`\`bash
docker compose up -d
\`\`\`

### 4. Start backend

\`\`\`bash
pnpm --filter @kpi/api start:dev
\`\`\`

### 5. Start frontend

\`\`\`bash
pnpm --filter @kpi/web dev
\`\`\`

## Useful Commands

| Command | Description |
|---|---|
| `pnpm install` | Install all dependencies |
| `pnpm -r lint` | Lint all packages |
| `pnpm -r typecheck` | Typecheck all packages |
| `pnpm -r test` | Test all packages |
| `pnpm --filter @kpi/api ...` | Run command in api only |

## Environment Variables

See `.env.example` for all required variables with descriptions.

## Roles

- `ADMIN` — full access to admin panel, user management, integration status
- `USER` — access to user panel and own data only
