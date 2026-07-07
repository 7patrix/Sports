# Demo Script

## 1. Open With Product Intent

"This is a health quiz funnel infrastructure, not just a survey UI. The point is to show how answers become durable data, how the system derives safe personalization, and how preview/full access is gated."

## 2. Show The Quiz

- Start on the first screen.
- Select a goal feeling and point out the Health Twin card changing immediately.
- Answer a limitation question and show the safety copy.
- Mention that every answer is saved through the API, so refresh/resume works.

## 3. Complete The Assessment

- Click reveal.
- Explain that the app validates required answers, computes a deterministic profile, and enqueues a report job.
- Show the AI timeline stages.

## 4. Show Backend Depth

Open `prisma/schema.prisma` and highlight:

- `AssessmentSession` vs `AssessmentAnswer`
- `AssessmentProfile` for derived signals
- `ReportJob`, `AgentLog`, `ReportArtifact`
- `Payment` and `Entitlement`

## 5. Unlock The Plan

- Show preview before checkout.
- Click mock subscribe.
- Full 4-week plan appears because entitlement is active.

## 6. Prove Quality

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Call out that scoring and report generation are deterministic and tested, while the worker pattern leaves room for a real LLM writer without weakening safety.
