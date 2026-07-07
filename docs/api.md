# API

## Quiz

### `GET /api/quiz/current`

Returns the active versioned quiz definition.

## Assessment Sessions

### `POST /api/assessment-sessions`

Creates or resumes an anonymous session.

Body:

```json
{
  "anonymousToken": "optional-existing-token"
}
```

### `GET /api/assessment-sessions/:sessionId`

Returns session progress, answers, profile, latest report job, logs, artifacts, results, and entitlements.

### `PATCH /api/assessment-sessions/:sessionId/answers`

Validates and upserts one answer.

Body:

```json
{
  "questionId": "activity_level",
  "value": "moderate"
}
```

### `POST /api/assessment-sessions/:sessionId/complete`

Validates required answers, computes deterministic profile, marks the session complete, creates a report job, and enqueues worker processing.

## Reports

### `GET /api/reports/:jobId`

Returns report status, progress, timeline logs, artifacts, and result if ready.

## Results

### `GET /api/results/:sessionId`

Returns preview for everyone with a ready result. Returns `fullPlan` only if the session has an active `assessment.full_plan` entitlement.

## Checkout

### `POST /api/checkout/mock`

Creates a paid mock payment and grants full-plan entitlement.

Body:

```json
{
  "sessionId": "assessment-session-id"
}
```

## Health

### `GET /api/health`

Checks Postgres and Redis connectivity.
