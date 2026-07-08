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

Validates and upserts one answer (step-wise save). The value is validated against
the question definition: option values must be allowed, numbers must be finite and
within `[min, max]`, scales must be integers in range. Illegal / out-of-range /
injection values return `422` and are not persisted.

Body:

```json
{
  "questionId": "weight_kg",
  "value": 72
}
```

### `POST /api/assessment-sessions/:sessionId/complete`

Validates required answers, computes deterministic profile, marks the session complete, creates a report job, and enqueues worker processing.

## Reports

### `GET /api/reports/:jobId`

Returns report status, progress, timeline logs, artifacts, and result if ready.

## Results

### `GET /api/results/:sessionId`

Returns the result with subscription-aware masking.

- **Everyone:** `preview`, `scores`, `safety`, and `healthMetrics.bmi` / `bmiCategory`.
- **Members only** (active `subscriptionStatus` or `assessment.full_plan` entitlement):
  `fullPlan`, and the concrete prediction data in `healthMetrics`
  (`recommendedCalories`, `macros`, `weeksToGoal`, `targetDateIso`, `projection`).

For non-members those fields are `null` and `healthMetrics.locked = true`.

```json
{
  "access": "preview",
  "subscriptionStatus": "FREE",
  "fullPlan": null,
  "healthMetrics": { "bmi": 25.5, "bmiCategory": "overweight", "recommendedCalories": null, "targetDateIso": null, "projection": null, "locked": true }
}
```

## Payment

### `POST /api/pay`

Simulated payment callback. Flips the session `subscriptionStatus` to `ACTIVE`,
records a paid `Payment`, and grants the full-plan entitlement in one transaction.
The session must be `COMPLETED`.

Body:

```json
{
  "sessionId": "assessment-session-id",
  "providerRef": "optional-external-ref"
}
```

Response:

```json
{ "sessionId": "...", "subscriptionStatus": "ACTIVE", "alreadyActive": false, "paymentId": "..." }
```

### `POST /api/checkout/mock`

Backwards-compatible alias used by the funnel UI. Shares the same activation
closure as `/api/pay`.

Body:

```json
{
  "sessionId": "assessment-session-id"
}
```

## Health

### `GET /api/health`

Checks Postgres and Redis connectivity.
