# MYCROWB SaaS Deployment Guide

## Architecture
- `mycrowb-backend`: Express API on Railway.
- `mycrowb-platform`: React PWA on Cloudflare Pages.
- `ai-prediction-service`: FastAPI microservice (Railway or container runtime).
- PostgreSQL managed instance.

## Backend (Railway)
1. Create Railway service from `mycrowb-backend`.
2. Set environment variables from `mycrowb-backend/.env.example`.
3. Attach PostgreSQL and set `DATABASE_URL` (must begin with `postgresql://` or `postgres://`). On Railway, prefer referencing `Postgres.DATABASE_URL`.
4. Run migrations command: `npx prisma migrate deploy`.

## Frontend (Cloudflare Pages)
1. Connect repo folder `mycrowb-platform`.
2. Build command: `npm run build`.
3. Output directory: `dist`.
4. Set `VITE_API_URL` pointing to Railway backend.

## AI Service
1. Deploy `ai-prediction-service` via Docker.
2. Expose port `8001`.
3. Set backend `AI_SERVICE_URL` to deployed endpoint.
