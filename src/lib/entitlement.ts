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
