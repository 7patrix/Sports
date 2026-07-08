import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { recordFunnelEvent } from "@/lib/events";
import { handleApiError, jsonError } from "@/lib/api";

const emailSchema = z.object({
  email: z.string().email()
});

type Params = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { sessionId } = await params;
    const { email } = emailSchema.parse(await request.json());

    const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } });
    if (!session) return jsonError("Session not found", 404);

    const updated = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: { email }
    });

    await recordFunnelEvent("email_captured", { hasEmail: true }, sessionId);

    return NextResponse.json({ email: updated.email });
  } catch (error) {
    return handleApiError(error);
  }
}
