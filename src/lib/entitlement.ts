import { prisma } from "@/lib/db";

export const fullPlanScope = "assessment.full_plan";

export async function hasFullPlanEntitlement(sessionId: string) {
  const entitlement = await prisma.entitlement.findUnique({
    where: {
      sessionId_scope: {
        sessionId,
        scope: fullPlanScope
      }
    }
  });

  return (
    entitlement?.status === "ACTIVE" &&
    (!entitlement.endsAt || entitlement.endsAt.getTime() > Date.now())
  );
}

/**
 * Full access is granted when either the entitlement is active or the session
 * subscription status is ACTIVE. Keeping both keeps the entitlement model
 * (fine-grained scopes) while satisfying the spec's subscription_status check.
 */
export async function hasFullAccess(sessionId: string) {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    select: { subscriptionStatus: true }
  });
  if (session?.subscriptionStatus === "ACTIVE") return true;
  return hasFullPlanEntitlement(sessionId);
}

export async function grantFullPlanEntitlement(sessionId: string) {
  return prisma.entitlement.upsert({
    where: {
      sessionId_scope: {
        sessionId,
        scope: fullPlanScope
      }
    },
    create: {
      sessionId,
      scope: fullPlanScope,
      status: "ACTIVE"
    },
    update: {
      status: "ACTIVE",
      endsAt: null
    }
  });
}
