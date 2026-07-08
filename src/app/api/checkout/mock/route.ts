import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { activateSubscription } from "@/lib/subscription";
import { recordFunnelEvent } from "@/lib/events";
import { handleApiError, jsonError } from "@/lib/api";

const checkoutSchema = z.object({
  sessionId: z.string().min(1)
});

/**
 * Backwards-compatible checkout alias used by the funnel UI. Shares the same
 * activation closure as POST /api/pay.
 */
export async function POST(request: Request) {
  try {
    const { sessionId } = checkoutSchema.parse(await request.json());
    const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } });
    if (!session) return jsonError("Session not found", 404);
    if (session.status !== "COMPLETED") return jsonError("Complete the assessment before checkout", 409);

    const result = await activateSubscription(sessionId, { providerRef: `mock_${sessionId}_${Date.now()}` });
    await recordFunnelEvent("mock_checkout_paid", { paymentId: result.paymentId }, sessionId);

    return NextResponse.json({
      sessionId,
      subscriptionStatus: result.subscriptionStatus,
      paymentId: result.paymentId
    });
  } catch (error) {
    return handleApiError(error);
  }
}
