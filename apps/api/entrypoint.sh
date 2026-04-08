#!/bin/sh
set -e

echo "Running migrations..."
cd /app/apps/api
npx prisma migrate deploy

echo "Running seed..."
npx prisma db seed || echo "Seed already done or failed, continuing..."

echo "Starting application..."
cd /app
node apps/api/dist/main
