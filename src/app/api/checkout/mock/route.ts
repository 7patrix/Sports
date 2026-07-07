import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { grantFullPlanEntitlement } from "@/lib/entitlement";
import { recordFunnelEvent } from "@/lib/events";
import { handleApiError, jsonError } from "@/lib/api";

const checkoutSchema = z.object({
  sessionId: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const { sessionId } = checkoutSchema.parse(await request.json());
    const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } });
    if (!session) return jsonError("Session not found", 404);
    if (session.status !== "COMPLETED") return jsonError("Complete the assessment before checkout", 409);

    const payment = await prisma.payment.create({
      data: {
        sessionId,
        providerRef: `mock_${randomUUID()}`,
        amountCents: 1900,
        currency: "USD",
        status: "PAID"
      }
    });
    const entitlement = await grantFullPlanEntitlement(sessionId);

    await recordFunnelEvent("mock_checkout_paid", { paymentId: payment.id }, sessionId);

    return NextResponse.json({ payment, entitlement });
  } catch (error) {
    return handleApiError(error);
  }
}
