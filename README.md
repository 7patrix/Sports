# Standout Health Funnel

AI-assisted Pilates health assessment funnel built for the Ruiqi full-stack challenge.

This is not a simple form app. It models the core infrastructure behind a BetterMe/Noom-style health funnel: versioned quiz, resumable anonymous sessions, deterministic scoring, async AI report generation, safety review, mock subscription, entitlement-gated full results, analytics events, and tests.

## Highlights

- Health Twin quiz experience with per-answer micro-feedback.
- Strong backend loop: answers -> signals -> preview -> queued report -> safety review -> full plan.
- Postgres is the source of truth; BullMQ only carries report job IDs.
- Preview/full result split with entitlement checks instead of a single `isSubscribed` flag.
- Real AI writer (OpenAI-compatible) for narrative copy, with a deterministic fallback so the demo works without a live LLM key.
- Interactive Rive Health Twin avatar that switches exercise animation by goal and safety limits.
- Tests for scoring (incl. pain/sleep/nutrition signals) and structured report generation.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Prisma + PostgreSQL
- Redis + BullMQ worker
- Zod validation
- Vitest

## Local Setup

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

Docker maps Postgres to `localhost:55432` and Redis to `localhost:56379` to avoid common local port conflicts.

Run the web app:

```bash
npm run dev
```

Run the report worker in a second terminal:

```bash
npm run worker
```

Open `http://localhost:3000`.

## AI writer

By default `MOCK_AI=true` uses the deterministic writer. To enable the real AI
writer, set `MOCK_AI=false` and provide `OPENAI_API_KEY` (and optionally
`OPENAI_BASE_URL` / `AI_MODEL`). The AI only writes narrative copy (summary +
coach note); the exercise structure stays deterministic and any AI failure
falls back automatically. The worker logs whether each report was AI or fallback.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Demo Flow

1. Start a new quiz.
2. Watch the Health Twin update after answers.
3. Finish all questions and reveal the plan seed.
4. Worker processes stages: mapping signals, building plan, safety review, publishing.
5. Preview is visible before payment.
6. Click mock subscribe to unlock the full 4-week plan.

## Docs

- `docs/architecture.md`
- `docs/api.md`
- `docs/demo-script.md`
- `docs/deployment.md`
