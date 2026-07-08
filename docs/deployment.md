# Deployment

This app has two runtime processes plus two managed dependencies:

- Web service: `npm run start` (Next.js app + API routes)
- Worker service: `npm run worker` (BullMQ consumer for report generation)
- PostgreSQL (managed)
- Redis (managed)

Postgres is the source of truth; the queue only carries job IDs. If you deploy
the web service without the worker, report jobs stay at `PENDING`.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `REDIS_URL` | yes | Redis connection string |
| `APP_URL` | yes | Public URL of the web service |
| `MOCK_AI` | no | `true` (default) uses deterministic fallback writer; set `false` to enable the real AI writer |
| `OPENAI_API_KEY` | when `MOCK_AI=false` | Key for the OpenAI-compatible endpoint |
| `OPENAI_BASE_URL` | no | Defaults to `https://api.openai.com/v1`; can point at any compatible endpoint |
| `AI_MODEL` | no | Defaults to `gpt-4o-mini` |

The AI writer only generates narrative copy (summary + coach note). The
safety-critical exercise structure is always deterministic, and any AI failure
falls back automatically.

## Database migrations

Run on each release before starting the app:

```bash
npm run db:deploy   # prisma migrate deploy
```

Optionally seed demo data (non-production):

```bash
npm run db:seed
```

## Option A: Railway (recommended)

1. Create a Railway project and add **PostgreSQL** and **Redis** plugins.
2. Create a **Web** service from the repo:
   - Build command: `npm run build`
   - Start command: `npm run start`
   - Deploy/release command: `npm run db:deploy`
   - Env: `DATABASE_URL`, `REDIS_URL`, `APP_URL`, and (optional) AI vars.
3. Create a **Worker** service from the same repo:
   - Start command: `npm run worker`
   - Env: `DATABASE_URL`, `REDIS_URL`, and AI vars (same values as web).
4. `prisma generate` runs automatically via the `postinstall` script.

## Option B: Docker

Two Dockerfiles are provided:

```bash
# Web
docker build -t health-funnel-web -f Dockerfile .
docker run -p 3000:3000 --env-file .env health-funnel-web

# Worker
docker build -t health-funnel-worker -f Dockerfile.worker .
docker run --env-file .env health-funnel-worker
```

Run `npm run db:deploy` once against the target database before first start.

## Health check

`GET /api/health` verifies Postgres and Redis connectivity and returns 503 if
either is unavailable. Point your platform's health check at this route.
