# Standout Health Funnel

AI-assisted Pilates health assessment funnel built for the Ruiqi full-stack challenge.

This is not a simple form app. It models the core infrastructure behind a BetterMe/Noom-style health funnel: versioned quiz, resumable anonymous sessions, deterministic scoring, async AI report generation, safety review, mock subscription, entitlement-gated full results, analytics events, and tests.

## Highlights

- Health Twin quiz experience with per-answer micro-feedback.
- Strong backend loop: answers -> signals -> preview -> queued report -> safety review -> full plan.
- Postgres is the source of truth; BullMQ only carries report job IDs.
- Preview/full result split with entitlement checks instead of a single `isSubscribed` flag.
- Deterministic fallback report generation, so the demo works without a live LLM key.
- Tests for scoring and structured report generation.

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

Run the web app:

```bash
npm run dev
```

Run the report worker in a second terminal:

```bash
npm run worker
```

Open `http://localhost:3000`.

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
