import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { fullPlanScope } from "@/lib/entitlement";

export const SUBSCRIPTION_PRICE_CENTS = 1900;

export type ActivateSubscriptionResult = {
  alreadyActive: boolean;
  paymentId: string;
  subscriptionStatus: "ACTIVE";
};

/**
 * Simulated payment callback closure: records a paid Payment, flips the session
 * subscription status to ACTIVE, and grants the full-plan entitlement - all in a
 * single transaction so the "pay -> unlocked" state change is atomic.
 */
export async function activateSubscription(
  sessionId: string,
  options: { providerRef?: string; amountCents?: number } = {}
): Promise<ActivateSubscriptionResult> {
  const providerRef = options.providerRef ?? `pay_${randomUUID()}`;
  const amountCents = options.amountCents ?? SUBSCRIPTION_PRICE_CENTS;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.entitlement.findUnique({
      where: { sessionId_scope: { sessionId, scope: fullPlanScope } }
    });
    const alreadyActive = existing?.status === "ACTIVE";

    const payment = await tx.payment.create({
      data: {
        sessionId,
        providerRef,
        amountCents,
        currency: "USD",
        status: "PAID"
      }
    });

    await tx.entitlement.upsert({
      where: { sessionId_scope: { sessionId, scope: fullPlanScope } },
      create: { sessionId, scope: fullPlanScope, status: "ACTIVE" },
      update: { status: "ACTIVE", endsAt: null }
    });

    await tx.assessmentSession.update({
      where: { id: sessionId },
      data: { subscriptionStatus: "ACTIVE" }
    });

    return { alreadyActive, paymentId: payment.id, subscriptionStatus: "ACTIVE" as const };
  });
}
