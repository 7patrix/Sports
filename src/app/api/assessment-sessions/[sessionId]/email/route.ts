import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { recordFunnelEvent } from "@/lib/events";
import { sendPlanReadyEmail } from "@/lib/mailer";
import { parseLocale } from "@/lib/locale";
import { handleApiError, jsonError } from "@/lib/api";

const emailSchema = z.object({
  email: z.string().email(),
  locale: z.string().optional()
});

type Params = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { email, locale: localeInput } = emailSchema.parse(body);
    const locale = parseLocale(localeInput);

    const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } });
    if (!session) return jsonError("Session not found", 404);

    const updated = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: { email }
    });

    await recordFunnelEvent("email_captured", { hasEmail: true }, sessionId);

    // Best-effort delivery: never fail the capture if sending is unavailable.
    const delivery = await sendPlanReadyEmail(email, { sessionId, locale });
    if (delivery.sent) {
      await recordFunnelEvent("email_sent", { provider: "resend" }, sessionId);
    }

    return NextResponse.json({ email: updated.email, delivered: delivery.sent });
  } catch (error) {
    return handleApiError(error);
  }
}
