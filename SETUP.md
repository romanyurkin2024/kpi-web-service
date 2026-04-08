# Setup Guide

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker Desktop
- Git

## Quick Start (Development)

### 1. Clone
```bash
git clone https://github.com/romanyurkin2024/kpi-web-service.git
cd kpi-web-service
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your values
# Minimum required:
# JWT_ACCESS_SECRET=your_secret
# JWT_REFRESH_SECRET=your_secret
```

### 4. Start infrastructure
```bash
docker compose up -d postgres
```

### 5. Run migrations and seed
```bash
pnpm --filter @kpi/api prisma migrate deploy
pnpm --filter @kpi/api prisma db seed
```

### 6. Start backend
```bash
pnpm --filter @kpi/api start:dev
```

### 7. Start frontend
```bash
pnpm --filter @kpi/web dev
```

- Backend: http://localhost:3000/api
- Frontend: http://localhost:3001
- Swagger: http://localhost:3000/api/docs

## Quick Start (Docker — Full Stack)

```bash
git clone https://github.com/romanyurkin2024/kpi-web-service.git
cd kpi-web-service
cp .env.example .env
# Edit .env — set JWT secrets and corporate DB credentials
docker compose up -d
```

All services start automatically.

## Corporate DB Integration

### PostgreSQL
```env
EXT_PG_ENABLED=true
EXT_PG_HOST=your_host
EXT_PG_PORT=5432
EXT_PG_USER=your_user
EXT_PG_PASSWORD=your_password
EXT_PG_DATABASE=your_database
```

### Oracle
```env
ORACLE_ENABLED=true
ORACLE_HOST=your_host
ORACLE_PORT=1521
ORACLE_USER=your_user
ORACLE_PASSWORD=your_password
ORACLE_SERVICE_NAME=your_service
```

## Default Credentials

- Admin: `admin@kpi.local` / `change_me_admin_password`

> Change these in `.env` before first run.
