import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasFullPlanEntitlement } from "@/lib/entitlement";
import { handleApiError, jsonError } from "@/lib/api";

type Params = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { sessionId } = await params;
    const result = await prisma.assessmentResult.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" }
    });

    if (!result) return jsonError("Result is not ready yet", 404);

    const profile = await prisma.assessmentProfile.findUnique({
      where: { sessionId },
      select: { scores: true }
    });

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      select: { email: true }
    });

    const fullAccess = await hasFullPlanEntitlement(sessionId);

    return NextResponse.json({
      access: fullAccess ? "full" : "preview",
      preview: result.previewPayload,
      fullPlan: fullAccess ? result.fullPayload : null,
      safety: result.safetyPayload,
      scores: profile?.scores ?? null,
      email: session?.email ?? null
    });
  } catch (error) {
    return handleApiError(error);
  }
}
