-- Subscription status on the session (spec: subscription_status gating)
CREATE TYPE "SubscriptionStatus" AS ENUM ('FREE', 'ACTIVE');

ALTER TABLE "AssessmentSession"
  ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'FREE';

-- Persisted server-side health assessment (BMI, calories, target date, projection)
ALTER TABLE "AssessmentProfile" ADD COLUMN "healthMetrics" JSONB;
