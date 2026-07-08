import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { activateSubscription } from "@/lib/subscription";
import { recordFunnelEvent } from "@/lib/events";
import { handleApiError, jsonError } from "@/lib/api";

const paySchema = z.object({
  sessionId: z.string().min(1),
  providerRef: z.string().min(1).max(120).optional()
});

/**
 * Simulated payment callback.
 *
 * POST /api/pay { sessionId, providerRef? }
 *
 * Flips the session's subscription status to ACTIVE, records a paid payment and
 * grants the full-plan entitlement. After this call the result endpoint returns
 * the full (un-masked) plan for the session.
 */
export async function POST(request: Request) {
  try {
    const { sessionId, providerRef } = paySchema.parse(await request.json());

    const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } });
    if (!session) return jsonError("Session not found", 404);
    if (session.status !== "COMPLETED") {
      return jsonError("Complete the assessment before paying", 409);
    }

    const result = await activateSubscription(sessionId, { providerRef });
    await recordFunnelEvent("payment_callback", { paymentId: result.paymentId, providerRef }, sessionId);

    return NextResponse.json({
      sessionId,
      subscriptionStatus: result.subscriptionStatus,
      alreadyActive: result.alreadyActive,
      paymentId: result.paymentId
    });
  } catch (error) {
    return handleApiError(error);
  }
}
